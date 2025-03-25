import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as sm from "aws-cdk-lib/aws-secretsmanager";
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
  /**
   * Redis secret.
   */
  public readonly redisSecret: sm.Secret;

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
      ec2.Peer.securityGroupId(this.cacheClientSg.securityGroupId),
      ec2.Port.tcp(6379),
      "Allow inbound from cache client"
    );

    const EXCLUDE_CHARACTERS = `"{}~()_=+[]\\|;:'",.?/@_*\\\``;

    this.redisSecret = new sm.Secret(this, "RedisSecret", {
      secretName: `${projectName}-${deployEnv}-redis-secret`,
      description: `${projectName}-${deployEnv} Redis secret`,
      generateSecretString: {
        excludeCharacters: EXCLUDE_CHARACTERS,
        excludePunctuation: true,
        generateStringKey: "password",
        passwordLength: 32,
        includeSpace: false,
        requireEachIncludedType: true,
        secretStringTemplate: JSON.stringify({
          username: "admin",
        }),
      },
    });

    const cluster = new elasticache.CfnReplicationGroup(
      this,
      "RedisReplicationGroup",
      {
        // authToken: this.redisSecret
        //   .secretValueFromJson("password")
        //   .unsafeUnwrap(),
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
