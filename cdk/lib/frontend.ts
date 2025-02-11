import * as cdk from "aws-cdk-lib";
import { CfnApp, CfnBranch } from "aws-cdk-lib/aws-amplify";
import { BuildSpec } from "aws-cdk-lib/aws-codebuild";
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

    const store1Amplify = new CfnApp(this, "Store1Amplify", {
      name: "demo-store-1",
      accessToken: currentEnvConfig.githubToken,
      repository: "https://github.com/penysho/sso-demo",
      buildSpec: BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: "demo-store-1",
            frontend: {
              phases: {
                preBuild: {
                  commands: ["npm install"],
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

    const store2Amplify = new CfnApp(this, "Store2Amplify", {
      name: "demo-store-2",
      accessToken: currentEnvConfig.githubToken,
      repository: "https://github.com/penysho/sso-demo",
      buildSpec: BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: "demo-store-2",
            frontend: {
              phases: {
                preBuild: {
                  commands: ["npm install"],
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

    store1Amplify.addPropertyOverride("environmentVariables", [
      {
        name: "AMPLIFY_MONOREPO_APP_ROOT",
        value: "demo-store-1",
      },
      {
        name: "NEXT_PUBLIC_STORE2_URL",
        value: store2Amplify.attrDefaultDomain,
      },
      {
        name: "NEXT_PUBLIC_API_URL",
        value: props.elbStack.LoadBalancer.loadBalancerDnsName,
      },
    ]);

    store2Amplify.addPropertyOverride("environmentVariables", [
      {
        name: "AMPLIFY_MONOREPO_APP_ROOT",
        value: "demo-store-2",
      },
      {
        name: "NEXT_PUBLIC_STORE1_URL",
        value: store1Amplify.attrDefaultDomain,
      },
      {
        name: "NEXT_PUBLIC_API_URL",
        value: props.elbStack.LoadBalancer.loadBalancerDnsName,
      },
    ]);

    new CfnBranch(this, "Store1Branch", {
      appId: store1Amplify.ref,
      branchName: currentEnvConfig.branch,
      framework: "Next.js - SSR",
      enableAutoBuild: false,
    });

    new CfnBranch(this, "Store2Branch", {
      appId: store2Amplify.ref,
      branchName: currentEnvConfig.branch,
      framework: "Next.js - SSR",
    });
  }
}
