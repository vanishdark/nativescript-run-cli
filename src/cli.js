import arg from 'arg';
import inquirer from 'inquirer';
import shell from 'shelljs';

function parseArgumentsIntoOptions(rawArgs) {
    const args = arg({
        '--11': Boolean,
        '--12': Boolean,
        '--13': Boolean,
        '--pro': Boolean,
        '--pro-max': Boolean,
        '--clean': Boolean,
        '-d': Boolean,
        '-c': '--clean'
    }, {argv: rawArgs.slice(2)});
    return {
        skip: args['-d'] || false,
        clean: args['--clean'] || false,
        eleven: args['--11'] || false,
        twelve: args['--12'] || false,
        thirteen: args['--13'] || false,
        pro: args['--pro'] || false,
        max: args['--pro-max'] || false,
        mobile: args._[0],
        version: args._[1]
    }
}

async function promptForMissingArguments(options) {
    const defaultMobile = '11';
    const defaultVersion = 'normal';

    if (options.skip) {
        return {
            ...options,
            mobile: options.mobile || defaultMobile,
            version: defaultVersion,
        }
    }

    const questionsMobile = [];
    if (!options.mobile){
        questionsMobile.push({
            type: 'list',
            name: 'mobile',
            message: 'Please choose which mobile to use',
            choices: ['11', '12', '13'],
            default: defaultMobile
        })
    }
    const answerMobile = await inquirer.prompt(questionsMobile)
    const questionsVersion = []
    if (!options.version) {
        questionsVersion.push({
            type: 'list',
            name: 'version',
            message: 'Please which mobile version to use',
            choices: answerMobile.mobile === '11' ? ['normal', 'pro', 'pro max'] : ['normal', 'mini', 'pro', 'pro max'],
            default: defaultVersion
        })
    }
    const answersQuestions = await inquirer.prompt(questionsVersion);
    return {
        ...options,
        mobile: options.mobile || answerMobile.mobile,
        version: options.version || answersQuestions.version
    }
}

async function validateNativescript(){
    if (!shell.which('ns')) {
        shell.echo('Sorry, you may need to install nativescript first!')
        return false;
    } else {
        return true;
    }
}

async function runScript(options) {
    if (options.clean) {
        await shell.exec('xcrun simctl shutdown all')
        await shell.exec('ns clean');
    }
    let command = `ns run ios --no-hmr --env.env=development --device 'iPhone ${options.mobile}`
    if(options.version === 'pro max') {
        command += ` Pro Max`
    }
    if(options.version === 'pro') {
        command += ` Pro`
    }
    if(options.version === 'mini') {
        command += ` mini`
    }
    command += `'`
    console.log(command);
    return await shell.exec(command)
}


export async function cli(args) {
    const validation = await validateNativescript();
    if (!validation) {shell.exit(1)}
    let options = parseArgumentsIntoOptions(args);
    options = await promptForMissingArguments(options);
    console.log(options);
    await runScript(options);
}