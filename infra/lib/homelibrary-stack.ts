import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import path from 'node:path';

// SSM parameter names — values are created in step 1.12
const SSM_DATASOURCE_URL   = '/homelibrary/prod/spring-datasource-url';
const SSM_JWT_SECRET       = '/homelibrary/prod/jwt-secret';
const SSM_ADMIN_BCRYPT     = '/homelibrary/prod/admin-password-hash';

export class HomelibraryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- Lambda ---

    const backendFunction = new lambda.Function(this, 'BackendFunction', {
      runtime: lambda.Runtime.JAVA_21,
      handler: 'com.homelibrary.StreamLambdaHandler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/target/homelibrary-0.0.1-SNAPSHOT.jar'),
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      snapStart: lambda.SnapStartConf.ON_PUBLISHED_VERSIONS,
      environment: {
        SPRING_PROFILES_ACTIVE: 'prod',
        SPRING_DATASOURCE_URL:  ssm.StringParameter.valueForStringParameter(this, SSM_DATASOURCE_URL),
        JWT_SECRET:             ssm.StringParameter.valueForStringParameter(this, SSM_JWT_SECRET),
        ADMIN_PASSWORD_HASH:    ssm.StringParameter.valueForStringParameter(this, SSM_ADMIN_BCRYPT),
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
        // CloudFront origin URL — updated in step 1.11
        allowOrigins:      ['https://placeholder.cloudfront.net'],
        allowMethods:      [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders:      ['Content-Type', 'Authorization'],
        allowCredentials:  true,
      },
    });

    httpApi.addRoutes({
      path:        '/{proxy+}',
      methods:     [apigwv2.HttpMethod.ANY],
      integration: new apigwv2integrations.HttpLambdaIntegration(
        'BackendIntegration',
        backendAlias,
      ),
    });
  }
}
