import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import { Construct } from "constructs";
import { deployEnv, projectName } from "../config/config";
import { VpcStack } from "./vpc";

interface ElasticacheStackProps extends cdk.StackProps {
  readonly vpcStack: VpcStack;
}

/**
 * Define resources for the Elasticache.
 */
export class ElasticacheStack extends cdk.Stack {
  /**
   * Security groups to attach to clients to make Elasticache accessible.
   */
  public readonly cacheClientSg: ec2.SecurityGroup;
  /**
   * Address of the Elasticache.
   */
  public readonly cacheAddr: string;

  constructor(scope: Construct, id: string, props: ElasticacheStackProps) {
    super(scope, id, props);

    const vpc = props.vpcStack.vpc;
    const publicSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
    });

    this.cacheClientSg = new ec2.SecurityGroup(this, "CacheClientSg", {
      vpc: vpc,
      allowAllOutbound: true,
    });

    const cacheSg = new ec2.SecurityGroup(this, "CacheSg", {
      vpc: vpc,
      allowAllOutbound: true,
    });
    cacheSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(6379),
      "Allow inbound from any IPv4 address"
    );

    const cluster = new elasticache.CfnReplicationGroup(
      this,
      "RedisReplicationGroup",
      {
        replicationGroupDescription: `${projectName}-${deployEnv} Replication group`,
        engine: "valkey",
        engineVersion: "7.2",
        cacheNodeType: "cache.t4g.micro",
        cacheSubnetGroupName: new elasticache.CfnSubnetGroup(
          this,
          "SubnetGroup",
          {
            description: `${projectName}-${deployEnv} Subnet group`,
            subnetIds: publicSubnets.subnetIds,
          }
        ).ref,
        cacheParameterGroupName: new elasticache.CfnParameterGroup(
          this,
          "ParameterGroup",
          {
            description: `${projectName}-${deployEnv} Parameter group`,
            cacheParameterGroupFamily: "valkey7",
          }
        ).ref,
        numNodeGroups: 1,
        replicasPerNodeGroup: 1,
        securityGroupIds: [cacheSg.securityGroupId],
        atRestEncryptionEnabled: true,
        transitEncryptionEnabled: true,
      }
    );
    this.cacheAddr = `${cluster.attrPrimaryEndPointAddress}:${cluster.attrPrimaryEndPointPort}`;
  }
}
