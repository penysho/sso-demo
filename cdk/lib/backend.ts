import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elasticloadbalancingv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { deployEnv, projectName } from "../config/config";
import { ElasticacheStack } from "./elasticache";
import { ElbStack } from "./elb";
import { VpcStack } from "./vpc";

export interface BackendStackProps extends cdk.StackProps {
  readonly vpcStack: VpcStack;
  readonly elbStack: ElbStack;
  readonly elasticacheStack: ElasticacheStack;
}

/**
 * Define resources for the backend.
 */
export class BackendStack extends cdk.Stack {
  /**
   * ECR
   */
  public readonly repository: ecr.IRepository;
  /**
   * ECS Cluster
   */
  public readonly cluster: ecs.CfnCluster;
  /**
   * ECS Service
   */
  public readonly service: ecs.CfnService;
  /**
   * Blue Target Group
   */
  public readonly blueTargetGroup: elasticloadbalancingv2.IApplicationTargetGroup;
  /**
   * Green Target Group
   */
  public readonly greenTargetGroup: elasticloadbalancingv2.IApplicationTargetGroup;

  public constructor(scope: cdk.App, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const vpc = props.vpcStack.vpc;
    const publicSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
    });

    const containerName = "app";
    const containerPort = 8011;

    // Resources
    this.cluster = new ecs.CfnCluster(this, "Cluster", {
      clusterName: `${projectName}-${deployEnv}`,
    });
    this.cluster.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;

    this.blueTargetGroup = new elasticloadbalancingv2.ApplicationTargetGroup(
      this,
      "BlueTargetGroup",
      {
        vpc,
        port: containerPort,
        targetType: elasticloadbalancingv2.TargetType.IP,
        healthCheck: {
          path: "/health",
          port: containerPort.toString(),
        },
      }
    );
    props.elbStack.Elb443Listener.addTargetGroups(
      `${projectName}-${deployEnv}-blue`,
      {
        targetGroups: [this.blueTargetGroup],
      }
    );

    this.greenTargetGroup = new elasticloadbalancingv2.ApplicationTargetGroup(
      this,
      "GreenTargetGroup",
      {
        vpc,
        port: containerPort,
        targetType: elasticloadbalancingv2.TargetType.IP,
        healthCheck: {
          path: "/health",
          port: containerPort.toString(),
        },
      }
    );
    props.elbStack.Elb443Listener.addTargetGroups(
      `${projectName}-${deployEnv}-green`,
      {
        targetGroups: [this.greenTargetGroup],
      }
    );

    const logGroup = new logs.CfnLogGroup(this, "LogGroup", {
      logGroupName: `/ecs/${projectName}-${deployEnv}`,
      retentionInDays: 90,
    });
    logGroup.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;

    this.repository = new ecr.Repository(this, "Repository", {
      repositoryName: `${projectName}-${deployEnv}`,
      lifecycleRules: [
        {
          rulePriority: 1,
          description: "Expire images older than 3 generations",
          maxImageCount: 3,
          tagStatus: ecr.TagStatus.ANY,
        },
      ],
    });

    const taskExecutionRole = new iam.CfnRole(this, "TaskExecutionRole", {
      roleName: `${projectName}-${deployEnv}-task-execution-role`,
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
      ],
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "ecs-tasks.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      },
    });
    taskExecutionRole.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;

    const taskRole = new iam.CfnRole(this, "TaskRole", {
      roleName: `${projectName}-${deployEnv}-task-role`,
      policies: [
        {
          policyName: `${projectName}-${deployEnv}-task-role-policy`,
          policyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: [
                  "ssmmessages:CreateControlChannel",
                  "ssmmessages:CreateDataChannel",
                  "ssmmessages:OpenControlChannel",
                  "ssmmessages:OpenDataChannel",
                ],
                Resource: ["*"],
              },
            ],
          },
        },
      ],
      assumeRolePolicyDocument: {
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "ecs-tasks.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      },
    });
    taskRole.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;

    const metricFilterForServerError = new logs.CfnMetricFilter(
      this,
      "MetricFilterForServerError",
      {
        filterName: "server-error",
        filterPattern: "?ERROR ?error ?Error",
        logGroupName: logGroup.ref,
        metricTransformations: [
          {
            metricValue: "1",
            metricNamespace: `${projectName}-${deployEnv}`,
            metricName: `${projectName}-${deployEnv}-server-error`,
          },
        ],
      }
    );
    metricFilterForServerError.cfnOptions.deletionPolicy =
      cdk.CfnDeletionPolicy.DELETE;

    const taskDefinition = new ecs.CfnTaskDefinition(this, "TaskDefinition", {
      cpu: "256",
      taskRoleArn: taskRole.attrArn,
      executionRoleArn: taskExecutionRole.attrArn,
      family: `${projectName}-${deployEnv}`,
      memory: "512",
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      containerDefinitions: [
        {
          name: containerName,
          image: [this.repository.repositoryUri, "latest"].join(":"),
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": logGroup.ref,
              "awslogs-region": `${this.region}`,
              "awslogs-stream-prefix": "ecs",
            },
          },
          portMappings: [
            {
              hostPort: containerPort,
              protocol: "tcp",
              containerPort: containerPort,
            },
          ],
          environment: [
            {
              name: "REDIS_ADDR",
              value: props.elasticacheStack.cacheAddr,
            },
            {
              name: "CORS_ALLOWED_ORIGIN",
              value: "*",
            },
          ],
        },
      ],
    });
    taskDefinition.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;

    this.service = new ecs.CfnService(this, "Service", {
      cluster: this.cluster.ref,
      enableExecuteCommand: true,
      launchType: "FARGATE",
      deploymentController: {
        type: "CODE_DEPLOY",
      },
      desiredCount: 1,
      loadBalancers: [
        {
          targetGroupArn: this.blueTargetGroup.targetGroupArn,
          containerPort: containerPort,
          containerName: containerName,
        },
      ],
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",
          securityGroups: [
            props.elbStack.ElbTargetSecurityGroup.securityGroupId,
            props.elasticacheStack.cacheClientSg.securityGroupId,
          ],
          subnets: publicSubnets.subnetIds,
        },
      },
      serviceName: `${projectName}-${deployEnv}-service`,
      taskDefinition: taskDefinition.ref,
    });
    this.service.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;
  }
}
