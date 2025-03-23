import * as cdk from "aws-cdk-lib";
import { CfnApp, CfnBranch, CfnDomain } from "aws-cdk-lib/aws-amplify";
import { BuildSpec } from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { currentEnvConfig, deployEnv } from "../config/config";
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

    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: currentEnvConfig.frontendDomainHostedZoneId,
      zoneName: "penysho.net",
    });

    const amplifyRole = new iam.Role(this, "AmplifyRole", {
      assumedBy: new iam.ServicePrincipal("amplify.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AdministratorAccess-Amplify"
        ),
      ],
    });

    const authHubAmplify = new CfnApp(this, "AuthHubAmplify", {
      name: "auth-hub",
      accessToken: currentEnvConfig.githubToken,
      iamServiceRole: amplifyRole.roleArn,
      repository: "https://github.com/penysho/sso-demo",
      environmentVariables: [
        {
          name: "AMPLIFY_MONOREPO_APP_ROOT",
          value: "auth-hub",
        },
        {
          name: "NEXT_PUBLIC_API_URL",
          value: `https://sso-demo-${deployEnv}-api.pesh-igpjt.com`,
        },
      ],
      buildSpec: BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: "auth-hub",
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

    const authHubBranch = new CfnBranch(this, "AuthHubBranch", {
      appId: authHubAmplify.attrAppId,
      branchName: currentEnvConfig.branch,
      framework: "Next.js - SSR",
      enableAutoBuild: false,
      stage: "PRODUCTION",
    });

    new CfnDomain(this, "AuthHubDomain", {
      appId: authHubAmplify.attrAppId,
      domainName: `sso-demo-${deployEnv}-auth-hub.${hostedZone.zoneName}`,
      enableAutoSubDomain: true,
      subDomainSettings: [
        {
          prefix: "",
          branchName: authHubBranch.branchName,
        },
      ],
    });

    const store3Amplify = new CfnApp(this, "Store3Amplify", {
      name: "demo-store-3",
      accessToken: currentEnvConfig.githubToken,
      iamServiceRole: amplifyRole.roleArn,
      environmentVariables: [
        {
          name: "AMPLIFY_MONOREPO_APP_ROOT",
          value: "demo-store-3",
        },
        {
          name: "NEXT_PUBLIC_API_URL",
          value: `https://sso-demo-${deployEnv}-api.pesh-igpjt.com`,
        },
        {
          name: "NEXT_PUBLIC_AUTH_HUB_URL",
          value: `https://sso-demo-${deployEnv}-auth-hub.${hostedZone.zoneName}`,
        },
      ],
      repository: "https://github.com/penysho/sso-demo",
      buildSpec: BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: "demo-store-3",
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

    new CfnBranch(this, "Store3Branch", {
      appId: store3Amplify.attrAppId,
      branchName: currentEnvConfig.branch,
      framework: "Next.js - SSR",
      enableAutoBuild: false,
      stage: "PRODUCTION",
    });
  }
}
