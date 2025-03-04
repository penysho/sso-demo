/**
 * Static values that do not depend on resources defined in our project are defined here and used from each stack.
 * Dynamic variables that depend on resources should be passed to each stack as props.
 */

// Define common configuration values for the project.
export const projectName: string = "sso-demo";

export const envCodes = ["dev", "tst", "prd"] as const;
export type EnvCode = (typeof envCodes)[number];

const getDeployEnv = () => {
  const env = process.env.DEPLOY_ENV;
  if (envCodes.includes(env as EnvCode)) {
    return env as EnvCode;
  }
  return "tst";
};
export const deployEnv: EnvCode = getDeployEnv();

// Define different settings for each deployment environment in the project.
export interface EnvConfig {
  backendImageTag: string;
  isApplicationDeploy: boolean;
  apiDomainHostedZoneId: string;
  frontendDomainHostedZoneId: string;
  certificateArn: string;
  defaultElbSgId: string;
  branch: string;
  githubToken: string;
}

export const envConfig: Record<EnvCode, EnvConfig> = {
  dev: {
    backendImageTag: "latest",
    isApplicationDeploy: true,
    apiDomainHostedZoneId: "Z1022019Y95GQ6B89EE1",
    frontendDomainHostedZoneId: "Z0792931131UPZVS92DMG",
    certificateArn:
      "arn:aws:acm:ap-northeast-1:551152530614:certificate/78e1479b-2bb2-4f89-8836-a8ff91227dfb",
    defaultElbSgId: "sg-0781f96eb35b3aaad",
    branch: "main",
    githubToken: "",
  },
  tst: {
    backendImageTag: "latest",
    isApplicationDeploy: true,
    apiDomainHostedZoneId: "Z1022019Y95GQ6B89EE1",
    frontendDomainHostedZoneId: "Z0792931131UPZVS92DMG",
    certificateArn:
      "arn:aws:acm:ap-northeast-1:551152530614:certificate/78e1479b-2bb2-4f89-8836-a8ff91227dfb",
    defaultElbSgId: "sg-0781f96eb35b3aaad",
    branch: "main",
    githubToken: "",
  },
  prd: {
    backendImageTag: "latest",
    isApplicationDeploy: true,
    apiDomainHostedZoneId: "Z1022019Y95GQ6B89EE1",
    frontendDomainHostedZoneId: "Z0792931131UPZVS92DMG",
    certificateArn:
      "arn:aws:acm:ap-northeast-1:551152530614:certificate/78e1479b-2bb2-4f89-8836-a8ff91227dfb",
    defaultElbSgId: "sg-0781f96eb35b3aaad",
    branch: "main",
    githubToken: "",
  },
};

export const currentEnvConfig: EnvConfig = envConfig[deployEnv];
