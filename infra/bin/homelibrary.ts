#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HomelibraryStack } from '../lib/homelibrary-stack';

const app = new cdk.App();

new HomelibraryStack(app, 'HomelibraryStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-central-1',
  },
});
