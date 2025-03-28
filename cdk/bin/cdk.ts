#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { currentEnvConfig, deployEnv, projectName } from "../config/config";
import { BackendStack } from "../lib/backend";
import { CiStack } from "../lib/ci";
import { ElasticacheStack } from "../lib/elasticache";
import { ElbStack } from "../lib/elb";
import { FrontendStack } from "../lib/frontend";
import { VpcStack } from "../lib/vpc";

const app = new cdk.App();

const envProps = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Get Value from context
const githubToken = app.node.tryGetContext("githubToken");
currentEnvConfig.githubToken = githubToken;
const jwtSecret = app.node.tryGetContext("jwtSecret");
currentEnvConfig.jwtSecret = jwtSecret;
const backendImageTag = app.node.tryGetContext("backendImageTag");
currentEnvConfig.backendImageTag = backendImageTag;
const isApplicationDeploy = app.node.tryGetContext("isApplicationDeploy");
currentEnvConfig.isApplicationDeploy = isApplicationDeploy;

// Define Stacks
const vpcStack = new VpcStack(app, `${projectName}-${deployEnv}-vpc`, {});

const elbStack = new ElbStack(app, `${projectName}-${deployEnv}-elb`, {
  env: envProps,
  vpcStack: vpcStack,
});

const elasticacheStack = new ElasticacheStack(
  app,
  `${projectName}-${deployEnv}-elasticache`,
  {
    env: envProps,
    vpcStack: vpcStack,
  }
);

const backendStack = new BackendStack(
  app,
  `${projectName}-${deployEnv}-backend`,
  {
    env: envProps,
    vpcStack: vpcStack,
    elbStack: elbStack,
    elasticacheStack: elasticacheStack,
  }
);

new CiStack(app, `${projectName}-${deployEnv}-ci`, {
  env: envProps,
  backendStack: backendStack,
});

new FrontendStack(app, `${projectName}-${deployEnv}-frontend`, {
  env: envProps,
  elbStack: elbStack,
});
