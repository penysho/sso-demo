import * as cdk from "aws-cdk-lib";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { currentEnvConfig, deployEnv, projectName } from "../config/config";
import { BackendStack } from "./backend";

interface CiStackProps extends cdk.StackProps {
  readonly backendStack: BackendStack;
}

/**
 * Define resources for the CI project.
 */
export class CiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CiStackProps) {
    super(scope, id, props);

    // CodeDeploy
    const codeDeploy = new codedeploy.CfnApplication(this, "CodeDeploy", {
      applicationName: `${projectName}-${deployEnv}`,
      computePlatform: "ECS",
    });

    const codeDeployServiceRole = new iam.CfnRole(
      this,
      "CodeDeployServiceRole",
      {
        roleName: `${projectName}-${deployEnv}-codedeploy-service-role`,
        managedPolicyArns: ["arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"],
        assumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "codedeploy.amazonaws.com",
              },
              Action: "sts:AssumeRole",
            },
          ],
        },
      }
    );
    codeDeployServiceRole.cfnOptions.deletionPolicy =
      cdk.CfnDeletionPolicy.DELETE;

    // CodeDeploy DeploymentGroup
    new codedeploy.CfnDeploymentGroup(this, "DeploymentGroup", {
      applicationName: codeDeploy.ref,
      autoRollbackConfiguration: {
        enabled: true,
        events: ["DEPLOYMENT_FAILURE"],
      },
      blueGreenDeploymentConfiguration: {
        deploymentReadyOption: {
          actionOnTimeout: "STOP_DEPLOYMENT",
          waitTimeInMinutes: 30,
        },
        terminateBlueInstancesOnDeploymentSuccess: {
          action: "TERMINATE",
          terminationWaitTimeInMinutes: 30,
        },
      },
      deploymentConfigName: "CodeDeployDefault.ECSAllAtOnce",
      deploymentGroupName: `${projectName}-${deployEnv}-group1`,
      deploymentStyle: {
        deploymentOption: "WITH_TRAFFIC_CONTROL",
        deploymentType: "BLUE_GREEN",
      },
      ecsServices: [
        {
          clusterName: props.backendStack.cluster.clusterName,
          serviceName: props.backendStack.service.serviceName,
        },
      ],
      loadBalancerInfo: {
        targetGroupPairInfoList: [
          {
            targetGroups: [
              {
                name: props.backendStack.blueTargetGroup.targetGroupName,
              },
              {
                name: props.backendStack.greenTargetGroup.targetGroupName,
              },
            ],
            prodTrafficRoute: {
              listenerArns: [props.backendStack.Elb443Listener.listenerArn],
            },
            testTrafficRoute: {
              listenerArns: [props.backendStack.GreenListener.listenerArn],
            },
          },
        ],
      },
      serviceRoleArn: codeDeployServiceRole.attrArn,
    });

    // OIDC Provider
    const oidcProvider = new iam.OpenIdConnectProvider(
      this,
      "GitHubActionsOidcProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
        thumbprints: ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
      }
    );

    // IAM Role for GitHub Actions
    const role = new iam.Role(this, "GitHubActionsRole", {
      assumedBy: new iam.FederatedPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            [`token.actions.githubusercontent.com:sub`]: `repo:penysho/${projectName}:ref:refs/heads/${currentEnvConfig.branch}`,
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ],
        resources: [props.backendStack.repository.repositoryArn],
        effect: iam.Effect.ALLOW,
      })
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RegisterTaskDefinition",
        ],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "codedeploy:CreateDeployment",
          "codedeploy:GetApplication",
          "codedeploy:GetApplicationRevision",
          "codedeploy:GetDeployment",
          "codedeploy:GetDeploymentConfig",
          "codedeploy:RegisterApplicationRevision",
          "codedeploy:GetDeploymentGroup",
        ],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
        conditions: {
          StringEqualsIfExists: {
            "iam:PassedToService": ["ecs-tasks.amazonaws.com"],
          },
        },
      })
    );
  }
}
