import arg from "arg";
import inquirer from "inquirer";
import shell from "shelljs";
import chalk from "chalk";

function parseArgumentsIntoOptions(rawArgs) {
  const args = arg(
    {
      "--android": Boolean,
      "--ios": Boolean,
      "--env-development": Boolean,
      "--env-production": Boolean,
      "--11": Boolean,
      "--12": Boolean,
      "--13": Boolean,
      "--pro": Boolean,
      "--pro-max": Boolean,
      "--clean": Boolean,
      "-d": Boolean,
      "-c": "--clean",
      "--dev": "--env-development",
      "--prod": "--env-production",
    },
    { argv: rawArgs.slice(2) }
  );
  return {
    skip: args["-d"] || false,
    clean: args["--clean"] || false,
    development: args["--env-development"] || false,
    production: args["--env-production"] || false,
    eleven: args["--11"] || false,
    twelve: args["--12"] || false,
    thirteen: args["--13"] || false,
    pro: args["--pro"] || false,
    max: args["--pro-max"] || false,
    ios: args["--ios"] || false,
    android: args["--android"] || false,
    mobile: args._[0],
    version: args._[1],
  };
}

async function promptForMissingArguments(options) {
  const defaultMobile = "skip";
  const defaultVersion = "normal";
  const defaultSystem = "ios";
  const defaultEnvironment = "development";

  if (options.skip) {
    return {
      ...options,
      mobile: defaultMobile,
      version: defaultVersion,
      environment: defaultEnvironment,
      system: defaultSystem,
    };
  }
  const questionsSystem = [];
  if (!options.android || !options.ios) {
    questionsSystem.push({
      type: "list",
      name: "system",
      message: "Please choose which system to use",
      choices: ["android", "ios"],
      default: defaultSystem,
    });
  }
  const answerSystem = await inquirer.prompt(questionsSystem);

  const questionsMobile = [];
  if (!options.mobile) {
    if (!options.ios && answerSystem.system == "ios") {
      questionsMobile.push({
        type: "list",
        name: "mobile",
        message: "Please choose which mobile to use",
        choices: ["11", "12", "13", "skip"],
        default: defaultMobile,
      });
    }
    if (!options.android && answerSystem.system === "android") {
      questionsMobile.push({
        type: "list",
        name: "mobile",
        message: "Please choose which mobile to use",
        choices: [
          "Pixel_3_XL_API_32",
          "Pixel_4_API_28",
          "Pixel_4_API_31",
          "skip",
        ],
        default: defaultMobile,
      });
    }
  }
  const answerMobile = await inquirer.prompt(questionsMobile);

  const questionsVersion = [];
  if (
    !options.version &&
    answerSystem.system === "ios" &&
    answerMobile.mobile !== "skip"
  ) {
    questionsVersion.push({
      type: "list",
      name: "version",
      message: "Please choose which mobile version to use",
      choices:
        answerMobile.mobile === "11"
          ? ["normal", "pro", "pro max"]
          : ["normal", "mini", "pro", "pro max"],
      default: defaultVersion,
    });
  }
  const answersQuestions = await inquirer.prompt(questionsVersion);

  let chooseEnv = "No";
  if (!options.development && !options.production) {
    chooseEnv = await inquirer.prompt({
      type: "list",
      name: "environmentChoose",
      message: "Do you want to choose the environment",
      choices: ["Yes", "No"],
      default: "No",
    });
  }
  const questionsEnvironment = [];
  if (
    ["Yes", "yes"].includes(chooseEnv.environmentChoose) &&
    (!options.development || !options.production)
  ) {
    questionsEnvironment.push({
      type: "list",
      name: "environment",
      message: "Which environment you want",
      choices: ["production", "development"],
      default: defaultEnvironment,
    });
  }
  const answersEnvironment = await inquirer.prompt(questionsEnvironment);
  return {
    ...options,
    environment:
      options.environment ||
      answersEnvironment.environment ||
      defaultEnvironment,
    system: options.system || answerSystem.system,
    mobile:
      options.mobile || answerMobile.mobile === "skip"
        ? undefined
        : answerMobile.mobile,
    version: options.version || answersQuestions.version,
  };
}

async function validateNativescript() {
  if (!shell.which("ns")) {
    shell.echo("Sorry, you may need to install nativescript first!");
    return false;
  } else {
    return true;
  }
}

async function runScript(options) {
  const answersClean = await inquirer.prompt({
    type: "list",
    name: "clean",
    message: "Choose a run option",
    choices: ["Clean and Run", "Run"],
    default: "run",
  });
  if (options.clean || answersClean.clean === "Clean and Run") {
    console.log("🧹 " + chalk.blue("[Cleaner]:") + " Start Cleaning");
    if (["ios"].includes(options.system)) {
      console.log(
        "🧹 " + chalk.blue("[Cleaner]:") + " Start Clean Old xCode Emulators"
      );
      await shell.exec("xcrun simctl shutdown all");
      console.log(
        "🧹 " + chalk.blue("[Cleaner]:") + " Finish Clean Old xCode Emulators"
      );
    }
    console.log("🧹 " + chalk.blue("[Cleaner]:") + " Start Cleaning Project");
    await shell.exec("ns clean");
    console.log(
      "🧹 " + chalk.blue("[Cleaner]:") + " Finish Clean Old xCode Emulators"
    );
  }
  let rawCommand = "ns run ";
  rawCommand += options.system + " --no-hmr";
  rawCommand += " --env.env==" + options.environment;
  let command = rawCommand;
  if (options.mobile) {
    command += ` --device`;
    if (options.system === "ios") {
      command += ` 'iPhone ${options.mobile}`;
      if (options.version === "pro max") {
        command += ` Pro Max`;
      }
      if (options.version === "pro") {
        command += ` Pro`;
      }
      if (options.version === "mini") {
        command += ` mini`;
      }
      command += `'`;
    }
    if (options.system === "android") {
      command += ` '${options.mobile}'`;
    }
  }
  console.log("😊 " + chalk.green("[Running command]: ") + command);
  return await shell.exec(command);
}

export async function cli(args) {
  const validation = await validateNativescript();
  if (!validation) {
    shell.exit(1);
  }
  let options = parseArgumentsIntoOptions(args);
  const result = shell.exec("ns device android --available-devices", {
    silent: true,
  });
  console.log(result.stderr.split("-").join(""));
  options = await promptForMissingArguments(options);
  await runScript(options);
}
