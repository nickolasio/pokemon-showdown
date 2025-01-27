"use strict"; //MUST USE 
const fs = require('fs'); //DISCORD HEADER START
const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const client = new Discord.Client();
client.commands = new Discord.Collection(); //DISCORD HEADER END
var built = false; //PSHOWDOWN CODE START

function build() {
    require('child_process').execSync('node build', { stdio: 'inherit', cwd: __dirname });
    built = true;
}
try {
    require.resolve('./.sim-dist/dex');
}
catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND')
        throw err; // should never happen
    build();
}
if (!process.argv[2] || /^[0-9]+$/.test(process.argv[2])) {
    // Start the server.
    //
    // The port the server should host on can be passed using the second argument
    // when launching with this file the same way app.js normally allows, e.g. to
    // host on port 9000:
    // $ ./pokemon-showdown 9000
    if (!built)
        build();
    require('module')._load('./.server-dist', module, true);
}
else
    switch (process.argv[2]) {
        case 'help':
        case 'h':
        case '?':
        case '-h':
        case '--help':
        case '-?':
            console.log('pokemon-showdown start [--skip-build] [PORT]');
            console.log('');
            console.log('  Starts a PS server on the specified port');
            console.log('  (Defaults to the port setting in config/config.js)');
            console.log('  (The port setting in config/config.js defaults to 8000)');
            console.log('');
            console.log('pokemon-showdown generate-team [FORMAT-ID [RANDOM-SEED]]');
            console.log('');
            console.log('  Generates a random team, and writes it to stdout in packed team format');
            console.log('  (Format defaults to "gen7randombattle")');
            console.log('');
            console.log('pokemon-showdown validate-team [FORMAT-ID]');
            console.log('');
            console.log('  Reads a team from stdin, and validates it');
            console.log('  If valid: exits with code 0');
            console.log('  If invalid: writes errors to stderr, exits with code 1');
            console.log('');
            console.log('pokemon-showdown simulate-battle');
            console.log('');
            console.log('  Simulates a battle, taking input to stdin and writing output to stdout');
            console.log('  Protocol is documented in ./.sim-dist/README.md');
            console.log('');
            console.log('pokemon-showdown unpack-team');
            console.log('');
            console.log('  Reads a team from stdin, writes the unpacked JSON to stdout');
            console.log('');
            console.log('pokemon-showdown pack-team');
            console.log('');
            console.log('  Reads a JSON team from stdin, writes the packed team to stdout');
            console.log('  NOTE for all team-processing functions: We can only handle JSON teams');
            console.log('  and packed teams; the PS server is incapable of processing exported');
            console.log('  teams.');
            console.log('');
            console.log('pokemon-showdown help');
            console.log('');
            console.log('  Displays this reference');
            break;
        case 'start':
            {
                process.argv.splice(2, 1);
                if (process.argv.includes('--skip-build')) {
                    built = true;
                }
                if (!built)
                    build();
                require('module')._load('./.server-dist', module, true);
                break;
            }
        case 'generate-team':
            {
                var Teams = require('./.sim-dist/teams').Teams;
                var seed = process.argv[4] ? process.argv[4].split(',').map(Number) : undefined;
                console.log(Teams.pack(Teams.generate(process.argv[3], { seed })));
            }
            break;
        case 'validate-team':
            {
                var Teams = require('./.sim-dist/teams').Teams;
                var TeamValidator = require('./.sim-dist/team-validator').TeamValidator;
                var validator = TeamValidator.get(process.argv[3]);
                var Streams = require('./.lib-dist/streams');
                var stdin = Streams.stdin();
                stdin.readLine().then(function (textTeam) {
                    try {
                        var team = Teams.unpack(textTeam);
                        var result = validator.validateTeam(team);
                        if (result) {
                            console.error(result.join('\n'));
                            process.exit(1);
                        }
                        process.exit(0);
                    }
                    catch (e) {
                        console.error(e);
                        process.exit(1);
                    }
                });
            }
            break;
        case 'simulate-battle':
            {
                var BattleTextStream = require('./.sim-dist/battle-stream').BattleTextStream;
                var Streams = require('./.lib-dist/streams');
                var stdin = Streams.stdin();
                var stdout = Streams.stdout();
                var args = process.argv.slice(3);
                var options = args.flatMap(function (arg) {
                    if (arg.charAt(0) !== '-') {
                        if (arg)
                            console.error("Invalid parameter: " + arg);
                        return [];
                    }
                    else if (arg.charAt(1) === '-') {
                        return arg.slice(2);
                    }
                    else {
                        return Array.from(arg.slice(1));
                    }
                });
                var debug = false;
                var replay = false;
                var spectate = false;
                for (var i = 0; i < options.length; i++) {
                    switch (options[i]) {
                        case 'debug':
                        case 'D':
                            debug = true;
                            break;
                        case 'replay':
                        case 'R':
                            replay = true;
                            break;
                        case 'spectate':
                        case 'spectator':
                        case 'S':
                            replay = true;
                            spectate = true;
                            break;
                        default:
                            console.error("Invalid option: " + options[i]);
                            break;
                    }
                }
                var battleStream = new BattleTextStream({
                    noCatch: true,
                    debug: debug,
                    replay: spectate ? 'spectator' : replay,
                });
                stdin.pipeTo(battleStream);
                battleStream.pipeTo(stdout);
            }
            break;
        case 'unpack-team':
            {
                var Teams = require('./.sim-dist/teams').Teams;
                var Streams = require('./.lib-dist/streams');
                var stdin = Streams.stdin();
                stdin.readLine().then(function (packedTeam) {
                    try {
                        var unpackedTeam = Teams.unpack(packedTeam);
                        console.log(JSON.stringify(unpackedTeam));
                        process.exit(0);
                    }
                    catch (e) {
                        console.error(e);
                        process.exit(1);
                    }
                });
            }
            break;
        case 'pack-team':
            {
                var Teams = require('./.sim-dist/teams').Teams;
                var Streams = require('./.lib-dist/streams');
                var stdin = Streams.stdin();
                stdin.readLine().then(function (unpackedTeam) {
                    try {
                        var packedTeam = Teams.pack(JSON.parse(unpackedTeam));
                        console.log(packedTeam);
                        process.exit(0);
                    }
                    catch (e) {
                        console.error(e);
                        process.exit(1);
                    }
                });
            }
            break;
        default:
            console.error('Unrecognized command: ' + process.argv[2]);
            console.error('Use `pokemon-showdown help` for help');
            process.exit(1);
    } //PSHOWDOWN CODE END

client.login('token');

