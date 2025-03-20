import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elasticloadbalancingv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import { currentEnvConfig, deployEnv } from "../config/config";
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
   * This is the security group for the ELB target group.
   */
  public readonly ElbTargetSg: ec2.ISecurityGroup;

  public constructor(scope: cdk.App, id: string, props: ElbStackProps) {
    super(scope, id, props);

    const vpc = props.vpcStack.vpc;

    // Resources
    const ElbSg = new ec2.SecurityGroup(this, "ElbSg", {
      vpc,
      allowAllOutbound: true,
      description:
        "This security group is allowed in the security group of the resource set in the Target Group.",
    });

    this.ElbTargetSg = new ec2.SecurityGroup(this, "ElbTargetSg", {
      vpc,
      allowAllOutbound: true,
      description:
        "This security group allows interaction with the ELBs set up in the target group. It is also allowed in the security group of the RDS to which the connection target is connected.",
    });
    this.ElbTargetSg.addIngressRule(
      ec2.Peer.securityGroupId(ElbSg.securityGroupId),
      ec2.Port.tcp(80),
      "Allow inbound from ELB security group"
    );
    this.ElbTargetSg.addIngressRule(
      ec2.Peer.securityGroupId(ElbSg.securityGroupId),
      ec2.Port.tcp(443),
      "Allow inbound from ELB security group"
    );

    // Allow inbound from public
    const defaultElbSg = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "DefaultElbSg",
      currentEnvConfig.defaultElbSgId
    );

    const loadBalancer = new elasticloadbalancingv2.ApplicationLoadBalancer(
      this,
      "LoadBalancer",
      {
        internetFacing: true,
        vpc,
        vpcSubnets: {
          subnets: vpc.publicSubnets,
        },
      }
    );
    loadBalancer.addSecurityGroup(ElbSg);
    loadBalancer.addSecurityGroup(defaultElbSg);
    this.LoadBalancer = loadBalancer;

    const hostedZone = route53.HostedZone.fromHostedZoneId(
      this,
      "HostedZone",
      currentEnvConfig.apiDomainHostedZoneId
    );

    new route53.ARecord(this, "RecordSet", {
      recordName: `sso-demo-${deployEnv}-api`,
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(this.LoadBalancer)
      ),
      ttl: cdk.Duration.minutes(5),
    });
  }
}
