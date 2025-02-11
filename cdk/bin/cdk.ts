#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { deployEnv, projectName } from "../config/config";
import { AppStack } from "../lib/app";
import { CiStack } from "../lib/ci";
import { ElbStack } from "../lib/elb";
import { VpcStack } from "../lib/vpc";

const app = new cdk.App();

const envProps = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const vpcStack = new VpcStack(app, `${projectName}-${deployEnv}-vpc`, {});

const elbStack = new ElbStack(app, `${projectName}-${deployEnv}-elb`, {
  ...envProps,
  vpcStack: vpcStack,
});

const appStack = new AppStack(app, `${projectName}-${deployEnv}-app`, {
  ...envProps,
  vpcStack: vpcStack,
  elbStack: elbStack,
});

new CiStack(app, `${projectName}-${deployEnv}-ci`, {
  ...envProps,
  elbStack: elbStack,
  appStack: appStack,
});
