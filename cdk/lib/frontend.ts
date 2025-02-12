import * as cdk from "aws-cdk-lib";
import { CfnApp, CfnBranch } from "aws-cdk-lib/aws-amplify";
import { BuildSpec } from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import { currentEnvConfig } from "../config/config";
import { ElbStack } from "./elb";

interface FrontendStackProps extends cdk.StackProps {
  readonly elbStack: ElbStack;
}

/**
 * Define resources for the frontend.
 */
export class FrontendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const amplifyRole = new iam.Role(this, "AmplifyRole", {
      assumedBy: new iam.ServicePrincipal("amplify.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AdministratorAccess-Amplify"
        ),
      ],
    });

    const store2Amplify = new CfnApp(this, "Store2Amplify", {
      name: "demo-store-2",
      oauthToken: currentEnvConfig.githubToken,
      iamServiceRole: amplifyRole.roleArn,
      repository: "https://github.com/penysho/sso-demo",
      environmentVariables: [
        {
          name: "AMPLIFY_MONOREPO_APP_ROOT",
          value: "demo-store-2",
        },
        {
          name: "NEXT_PUBLIC_API_URL",
          value: `https://${props.elbStack.LoadBalancer.loadBalancerDnsName}`,
        },
      ],
      buildSpec: BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: "demo-store-2",
            frontend: {
              phases: {
                preBuild: {
                  commands: ["nvm install 22.8", "nvm use 22.8", "npm install"],
                },
                build: {
                  commands: ["npm run build"],
                },
              },
              artifacts: {
                baseDirectory: ".next",
                files: ["**/*"],
              },
              cache: {
                paths: ["node_modules/**/*"],
              },
            },
          },
        ],
      }).toBuildSpec(),
      platform: "WEB_COMPUTE",
      customRules: [
        {
          source: "/<*>",
          target: "/index.html",
          status: "404-200",
        },
      ],
    });

    const store1Amplify = new CfnApp(this, "Store1Amplify", {
      name: "demo-store-1",
      oauthToken: currentEnvConfig.githubToken,
      iamServiceRole: amplifyRole.roleArn,
      environmentVariables: [
        {
          name: "AMPLIFY_MONOREPO_APP_ROOT",
          value: "demo-store-1",
        },
        {
          name: "NEXT_PUBLIC_API_URL",
          value: `https://${props.elbStack.LoadBalancer.loadBalancerDnsName}`,
        },
        {
          name: "NEXT_PUBLIC_STORE2_URL",
          value: store2Amplify.attrDefaultDomain,
        },
      ],
      repository: "https://github.com/penysho/sso-demo",
      buildSpec: BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: "demo-store-1",
            frontend: {
              phases: {
                preBuild: {
                  commands: ["nvm install 22.8", "nvm use 22.8", "npm install"],
                },
                build: {
                  commands: ["npm run build"],
                },
              },
              artifacts: {
                baseDirectory: ".next",
                files: ["**/*"],
              },
              cache: {
                paths: ["node_modules/**/*"],
              },
            },
          },
        ],
      }).toBuildSpec(),
      platform: "WEB_COMPUTE",
      customRules: [
        {
          source: "/<*>",
          target: "/index.html",
          status: "404-200",
        },
      ],
    });

    new CfnBranch(this, "Store1Branch", {
      appId: store1Amplify.attrAppId,
      branchName: currentEnvConfig.branch,
      framework: "Next.js - SSR",
      enableAutoBuild: false,
      stage: "PRODUCTION",
    });

    new CfnBranch(this, "Store2Branch", {
      appId: store2Amplify.attrAppId,
      branchName: currentEnvConfig.branch,
      framework: "Next.js - SSR",
      enableAutoBuild: false,
      stage: "PRODUCTION",
    });
  }
}
