import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset, Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elasticloadbalancingv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ecrdeploy from "cdk-ecr-deployment";
import * as path from "path";
import { currentEnvConfig, deployEnv, projectName } from "../config/config";
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
  public readonly cluster: ecs.ICluster;
  /**
   * ECS Service
   */
  public readonly service: ecs.IBaseService;
  /**
   * Listener ARN for port 80 used by ALB in applications.
   */
  public readonly Elb80Listener: elasticloadbalancingv2.IApplicationListener;
  /**
   * Listener ARN for port 443 used by ALB in applications.
   */
  public readonly Elb443Listener: elasticloadbalancingv2.IApplicationListener;
  /**
   * This is the group ID of the security group for the ALB target of applications.
   */
  public readonly GreenListener: elasticloadbalancingv2.IApplicationListener;
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

    const containerName = "backend";
    const containerPort = 8080;

    // Resources

    // Listeners
    this.Elb443Listener = new elasticloadbalancingv2.ApplicationListener(
      this,
      "Elb443Listener",
      {
        loadBalancer: props.elbStack.LoadBalancer,
        defaultAction: elasticloadbalancingv2.ListenerAction.fixedResponse(
          403,
          { contentType: "text/plain" }
        ),
        port: 443,
        protocol: elasticloadbalancingv2.ApplicationProtocol.HTTPS,
        certificates: [
          {
            certificateArn: currentEnvConfig.certificateArn,
          },
        ],
      }
    );

    this.Elb80Listener = new elasticloadbalancingv2.ApplicationListener(
      this,
      "Elb80Listener",
      {
        loadBalancer: props.elbStack.LoadBalancer,
        defaultAction: elasticloadbalancingv2.ListenerAction.fixedResponse(
          403,
          { contentType: "text/plain" }
        ),
        port: 80,
        protocol: elasticloadbalancingv2.ApplicationProtocol.HTTP,
      }
    );

    this.GreenListener = new elasticloadbalancingv2.ApplicationListener(
      this,
      "GreenListener",
      {
        loadBalancer: props.elbStack.LoadBalancer,
        port: 10443,
        protocol: elasticloadbalancingv2.ApplicationProtocol.HTTP,
        defaultAction: elasticloadbalancingv2.ListenerAction.fixedResponse(
          403,
          { contentType: "text/plain" }
        ),
      }
    );

    // Target Groups
    this.blueTargetGroup = new elasticloadbalancingv2.ApplicationTargetGroup(
      this,
      "BlueTargetGroup",
      {
        vpc,
        port: containerPort,
        protocol: elasticloadbalancingv2.ApplicationProtocol.HTTP,
        targetType: elasticloadbalancingv2.TargetType.IP,
        healthCheck: {
          path: "/health",
          port: containerPort.toString(),
        },
      }
    );
    this.Elb443Listener.addTargetGroups(`${projectName}-${deployEnv}-blue`, {
      targetGroups: [this.blueTargetGroup],
    });

    this.greenTargetGroup = new elasticloadbalancingv2.ApplicationTargetGroup(
      this,
      "GreenTargetGroup",
      {
        vpc,
        port: containerPort,
        protocol: elasticloadbalancingv2.ApplicationProtocol.HTTP,
        targetType: elasticloadbalancingv2.TargetType.IP,
        healthCheck: {
          path: "/health",
          port: containerPort.toString(),
        },
      }
    );
    this.GreenListener.addTargetGroups(`${projectName}-${deployEnv}-green`, {
      targetGroups: [this.greenTargetGroup],
    });

    // Cluster
    this.cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      clusterName: `${projectName}-${deployEnv}`,
    });

    // ECR
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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    if (currentEnvConfig.isApplicationDeploy) {
      const dockerImageAsset = new DockerImageAsset(this, "DockerImageAsset", {
        directory: path.join(__dirname, "../.."),
        buildArgs: {
          CGO_ENABLED: "0",
          GOOS: "linux",
          GOARCH: "amd64",
        },
        file: "backend/docker/Dockerfile.remote",
        platform: Platform.LINUX_AMD64,
        target: "prod",
      });

      new ecrdeploy.ECRDeployment(this, "DeployDockerImage", {
        src: new ecrdeploy.DockerImageName(dockerImageAsset.imageUri),
        dest: new ecrdeploy.DockerImageName(
          [
            this.repository.repositoryUri,
            currentEnvConfig.backendImageTag,
          ].join(":")
        ),
      });
    }

    // Log Group
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      retention: logs.RetentionDays.THREE_MONTHS,
    });

    const metricFilterForServerError = new logs.CfnMetricFilter(
      this,
      "MetricFilterForServerError",
      {
        filterName: "server-error",
        filterPattern: "?ERROR ?error ?Error",
        logGroupName: logGroup.logGroupName,
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

    // Task definition
    const taskExecutionRole = new iam.Role(this, "TaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        {
          managedPolicyArn:
            "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        },
      ],
    });

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        cpu: 256,
        memoryLimitMiB: 512,
        executionRole: taskExecutionRole,
        family: `${projectName}-backend-${deployEnv}`,
      }
    );
    const container = taskDefinition.addContainer(containerName, {
      containerName,
      image: ecs.ContainerImage.fromEcrRepository(
        this.repository,
        currentEnvConfig.backendImageTag
      ),
      essential: true,
      portMappings: [
        {
          containerPort: containerPort,
          hostPort: containerPort,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: "ecs",
      }),
    });
    container.addEnvironment("REDIS_ADDR", props.elasticacheStack.cacheAddr);
    container.addEnvironment("CORS_ALLOWED_ORIGIN", "*");

    // Service
    const service = new ecs.FargateService(this, "Service", {
      cluster: this.cluster,
      serviceName: `${projectName}-backend-${deployEnv}`,
      taskDefinition,
      desiredCount: 1,
      deploymentController: {
        type: ecs.DeploymentControllerType.CODE_DEPLOY,
      },
      enableExecuteCommand: true,
      assignPublicIp: true,
      securityGroups: [
        props.elbStack.ElbTargetSg,
        props.elasticacheStack.cacheClientSg,
      ],
      vpcSubnets: {
        subnets: publicSubnets.subnets,
      },
    });
    service.attachToApplicationTargetGroup(this.blueTargetGroup);
    this.service = service;
  }
}
