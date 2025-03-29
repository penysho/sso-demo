import * as cdk from "aws-cdk-lib";
import { CfnApp, CfnBranch, CfnDomain } from "aws-cdk-lib/aws-amplify";
import { BuildSpec } from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import { currentEnvConfig, deployEnv, projectName } from "../config/config";
import { ElbStack } from "./elb";

interface FrontendStackProps extends cdk.StackProps {
  readonly elbStack: ElbStack;
}

/**
 * Define resources for the frontend.
 */
export class FrontendStack extends cdk.Stack {
  /**
   * Auth Hub Amplify
   */
  public readonly authHubAmplify: CfnApp;
  /**
   * Auth Hub Green Amplify
   */
  public readonly authHubGreenAmplify: CfnApp;
  /**
   * Store 3 Amplify
   */
  public readonly store3Amplify: CfnApp;

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

    this.authHubAmplify = new CfnApp(this, "AuthHubAmplify", {
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
          value: `https://${projectName}-${deployEnv}-api.${currentEnvConfig.apiDomain}`,
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
      appId: this.authHubAmplify.attrAppId,
      branchName: currentEnvConfig.branch,
      framework: "Next.js - SSR",
      enableAutoBuild: false,
      stage: "PRODUCTION",
    });

    new CfnDomain(this, "AuthHubDomain", {
      appId: this.authHubAmplify.attrAppId,
      domainName: `${projectName}-${deployEnv}-auth-hub.${currentEnvConfig.frontendDomain}`,
      enableAutoSubDomain: true,
      subDomainSettings: [
        {
          prefix: "",
          branchName: authHubBranch.branchName,
        },
      ],
    });

    this.authHubGreenAmplify = new CfnApp(this, "AuthHubGreenAmplify", {
      name: "auth-hub-green",
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
          value: `http://${projectName}-${deployEnv}-api.${currentEnvConfig.apiDomain}:10443`,
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

    const authHubGreenBranch = new CfnBranch(this, "AuthHubGreenBranch", {
      appId: this.authHubGreenAmplify.attrAppId,
      branchName: currentEnvConfig.branch,
      framework: "Next.js - SSR",
      enableAutoBuild: false,
      stage: "PRODUCTION",
    });

    new CfnDomain(this, "AuthHubGreenDomain", {
      appId: this.authHubGreenAmplify.attrAppId,
      domainName: `${projectName}-${deployEnv}-auth-hub-green.${currentEnvConfig.frontendDomain}`,
      enableAutoSubDomain: true,
      subDomainSettings: [
        {
          prefix: "",
          branchName: authHubGreenBranch.branchName,
        },
      ],
    });

    this.store3Amplify = new CfnApp(this, "Store3Amplify", {
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
          value: `https://${projectName}-${deployEnv}-api.${currentEnvConfig.apiDomain}`,
        },
        {
          name: "NEXT_PUBLIC_AUTH_HUB_URL",
          value: `https://${projectName}-${deployEnv}-auth-hub.${currentEnvConfig.frontendDomain}`,
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
      appId: this.store3Amplify.attrAppId,
      branchName: currentEnvConfig.branch,
      framework: "Next.js - SSR",
      enableAutoBuild: false,
      stage: "PRODUCTION",
    });
  }
}
