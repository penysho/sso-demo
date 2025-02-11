import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elasticloadbalancingv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { currentEnvConfig } from "../config/config";
import { VpcStack } from "./vpc";

export interface ElbStackProps extends cdk.StackProps {
  readonly vpcStack: VpcStack;
}

/**
 * Define ALB resources for generic use in applications.
 */
export class ElbStack extends cdk.Stack {
  /**
   * This is the ARN of the ALB for applications.
   */
  public readonly LoadBalancer: elasticloadbalancingv2.IApplicationLoadBalancer;
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
   * This is the ARN of the listener for the Green environment used in the ALB of applications.
   */
  public readonly ElbTargetSecurityGroup: ec2.ISecurityGroup;

  public constructor(scope: cdk.App, id: string, props: ElbStackProps) {
    super(scope, id, props);

    const vpc = props.vpcStack.vpc;

    // Resources
    const ElbSecurityGroup = new ec2.SecurityGroup(this, "ElbSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description:
        "This security group is allowed in the security group of the resource set in the Target Group.",
    });

    this.ElbTargetSecurityGroup = new ec2.SecurityGroup(
      this,
      "ElbTargetSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description:
          "This security group allows interaction with the ELBs set up in the target group. It is also allowed in the security group of the RDS to which the connection target is connected.",
      }
    );
    this.ElbTargetSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(ElbSecurityGroup.securityGroupId),
      ec2.Port.tcp(80),
      "Allow inbound from ELB security group"
    );
    this.ElbTargetSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(ElbSecurityGroup.securityGroupId),
      ec2.Port.tcp(443),
      "Allow inbound from ELB security group"
    );

    const defaultElbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "DefaultElbSecurityGroup",
      currentEnvConfig.defaultElbSecurityGroupId
    );

    const LoadBalancer = new elasticloadbalancingv2.ApplicationLoadBalancer(
      this,
      "LoadBalancer",
      {
        internetFacing: true,
        vpc,
        vpcSubnets: {
          subnets: vpc.privateSubnets,
        },
      }
    );
    LoadBalancer.addSecurityGroup(ElbSecurityGroup);
    LoadBalancer.addSecurityGroup(defaultElbSecurityGroup);

    this.Elb443Listener = new elasticloadbalancingv2.ApplicationListener(
      this,
      "Elb443Listener",
      {
        loadBalancer: LoadBalancer,
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
        loadBalancer: LoadBalancer,
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
        loadBalancer: LoadBalancer,
        port: 10443,
        protocol: elasticloadbalancingv2.ApplicationProtocol.HTTP,
        defaultAction: elasticloadbalancingv2.ListenerAction.fixedResponse(
          403,
          { contentType: "text/plain" }
        ),
      }
    );
  }
}
