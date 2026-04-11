import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import path from 'node:path';

// SSM parameter names — values must be created manually in AWS as String type before deploy (step 1.12)
// Note: valueForStringParameter() generates AWS::SSM::Parameter::Value<String> CloudFormation parameter type,
// which does NOT support SecureString — CloudFormation cannot resolve SecureString into Lambda env vars.
// The correct solution would be AWS Secrets Manager, but it is excluded due to its cost (~$0.40/secret/month).
// Lambda env vars are encrypted at rest by AWS, so String type is an acceptable trade-off for a non-commercial project.
const SSM_NEON_CONN_STRING = '/homelibrary/neon-connection-string';
const SSM_NEON_USERNAME    = '/homelibrary/neon-username';
const SSM_NEON_CRED        = '/homelibrary/neon-password';
const SSM_JWT_SECRET       = '/homelibrary/jwt-secret';
const SSM_ADMIN_BCRYPT     = '/homelibrary/admin-password-hash';

const GITHUB_OIDC_URL  = 'https://token.actions.githubusercontent.com';
const GITHUB_REPO_SUB  = 'repo:hunkpdev/homelibrary:ref:refs/heads/main';

export class HomelibraryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- S3 ---

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      // versioned: false — rollback is handled via git revert + redeploy through the CI/CD pipeline
      // S3 versioning not needed for non-commercial use: the workflow always deploys a clean dist/
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // --- CloudFront ---

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        // S3 returns 403 for missing files (not 404) when public access is blocked
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });

    // --- Lambda ---

    const backendFunction = new lambda.Function(this, 'BackendFunction', {
      functionName: 'homelibrary-backend',
      runtime: lambda.Runtime.JAVA_21,
      handler: 'com.homelibrary.StreamLambdaHandler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/target/homelibrary-0.0.1-SNAPSHOT.jar'),
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      snapStart: lambda.SnapStartConf.ON_PUBLISHED_VERSIONS,
      environment: {
        SPRING_PROFILES_ACTIVE:      'prod',
        SPRING_DATASOURCE_URL:       ssm.StringParameter.valueForStringParameter(this, SSM_NEON_CONN_STRING),
        SPRING_DATASOURCE_USERNAME:  ssm.StringParameter.valueForStringParameter(this, SSM_NEON_USERNAME),
        SPRING_DATASOURCE_PASSWORD:  ssm.StringParameter.valueForStringParameter(this, SSM_NEON_CRED),
        JWT_SECRET:                  ssm.StringParameter.valueForStringParameter(this, SSM_JWT_SECRET),
        ADMIN_PASSWORD_HASH:         ssm.StringParameter.valueForStringParameter(this, SSM_ADMIN_BCRYPT),
      },
    });

    // SnapStart only works on published versions — alias points to the latest published version
    const backendAlias = new lambda.Alias(this, 'BackendAlias', {
      aliasName: 'live',
      version: backendFunction.currentVersion,
    });

    // --- HTTP API Gateway ---

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      corsPreflight: {
        allowOrigins:     [`https://${distribution.distributionDomainName}`],
        allowMethods:     [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders:     ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
    });

    httpApi.addRoutes({
      path:        '/{proxy+}',
      methods:     [apigwv2.HttpMethod.ANY],
      integration: new apigwv2integrations.HttpLambdaIntegration(
        'BackendIntegration',
        backendAlias,
        {
          // aws-serverless-java-container defaultProxy() expects v1.0 (REST API proxy format).
          // HTTP API Gateway defaults to v2.0 — explicitly set v1.0 to match the handler.
          payloadFormatVersion: apigwv2.PayloadFormatVersion.VERSION_1_0,
        },
      ),
    });

    // --- IAM + OIDC ---

    const oidcProvider = new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
      url: GITHUB_OIDC_URL,
      clientIds: ['sts.amazonaws.com'],
    });

    const githubActionsRole = new iam.Role(this, 'GithubActionsRole', {
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          'token.actions.githubusercontent.com:sub': GITHUB_REPO_SUB,
        },
      }),
    });

    githubActionsRole.addToPolicy(new iam.PolicyStatement({
      actions:   ['lambda:UpdateFunctionCode', 'lambda:PublishVersion', 'lambda:UpdateAlias'],
      resources: [backendFunction.functionArn],
    }));

    githubActionsRole.addToPolicy(new iam.PolicyStatement({
      actions:   ['s3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: [frontendBucket.bucketArn, `${frontendBucket.bucketArn}/*`],
    }));

    githubActionsRole.addToPolicy(new iam.PolicyStatement({
      actions:   ['cloudfront:CreateInvalidation'],
      resources: [`arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`],
    }));

    githubActionsRole.addToPolicy(new iam.PolicyStatement({
      actions:   ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/homelibrary/*`],
    }));

    new cdk.CfnOutput(this, 'GithubActionsRoleArn', {
      value: githubActionsRole.roleArn,
    });
  }
}
