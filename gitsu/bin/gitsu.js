'use strict';

process.bin = process.title = 'gitsu';

//var HWCore = require('hwcore/modules/js/src/kernel');

//HWCore(function () {
    var Q = require('q');
    var mout = require('mout');
    var Logger = require('bower-logger');
    var osenv = require('osenv');
    var pkg = require('../../package.json');
    var gitsu = require('../src/lib');
    var cli = require('../src/lib/util/cli');
    var rootCheck = require('../src/lib/util/rootCheck');
    var analytics = require('../src/lib/util/analytics');

    var options;
    var renderer;
    var loglevel;
    var command;
    var commandFunc;
    var logger;
    var levels = Logger.LEVELS;

    options = cli.readOptions({
        version: {type: Boolean, shorthand: 'v'},
        help: {type: Boolean, shorthand: 'h'},
        'allow-root': {type: Boolean}
    });

// Handle print of version
    if (options.version) {
        process.stdout.write(pkg.version + '\n');
        process.exit();
    }

// Root check
    rootCheck(options, gitsu.config);

// Set loglevel
    if (gitsu.config.silent) {
        loglevel = levels.error;
    } else if (gitsu.config.verbose) {
        loglevel = -Infinity;
        Q.longStackSupport = true;
    } else if (gitsu.config.quiet) {
        loglevel = levels.warn;
    } else {
        loglevel = levels[gitsu.config.loglevel] || levels.info;
    }

// Get the command to execute
    while (options.argv.remain.length) {
        command = options.argv.remain.join(' ');

        // Alias lookup
        if (gitsu.abbreviations[command]) {
            command = gitsu.abbreviations[command].replace(/\s/g, '.');
            break;
        }

        command = command.replace(/\s/g, '.');

        // Direct lookup
        if (mout.object.has(gitsu.commands, command)) {
            break;
        }

        options.argv.remain.pop();
    }

// Ask for Insights on first run.
    analytics.setup(gitsu.config).then(function () {
        // Execute the command
        commandFunc = command && mout.object.get(gitsu.commands, command);
        command = command && command.replace(/\./g, ' ');

        // If no command was specified, show gitsu help
        // Do the same if the command is unknown
        if (!commandFunc) {
            logger = gitsu.commands.help();
            command = 'help';
            // If the user requested help, show the command's help
            // Do the same if the actual command is a group of other commands (e.g.: cache)
        } else if (options.help || !commandFunc.line) {
            logger = gitsu.commands.help(command);
            command = 'help';
            // Call the line method
        } else {
            logger = commandFunc.line(process.argv);

            // If the method failed to interpret the process arguments
            // show the command help
            if (!logger) {
                logger = gitsu.commands.help(command);
                command = 'help';
            }
        }

        // Get the renderer and configure it with the executed command
        renderer = cli.getRenderer(command, logger.json, gitsu.config);

        logger
                .on('end', function (data) {
                    if (!gitsu.config.silent && !gitsu.config.quiet) {
                        renderer.end(data);
                    }
                })
                .on('error', function (err) {
                    if (levels.error >= loglevel) {
                        renderer.error(err);
                    }

                    process.exit(1);
                })
                .on('log', function (log) {
                    if (levels[log.level] >= loglevel) {
                        renderer.log(log);
                    }
                })
                .on('prompt', function (prompt, callback) {
                    renderer.prompt(prompt)
                            .then(function (answer) {
                                callback(answer);
                            });
                });

        // Warn if HOME is not SET
        if (!osenv.home()) {
            logger.warn('no-home', 'HOME not set, user configuration will not be loaded');
        }

        if (gitsu.config.interactive) {
            var updateNotifier = require('update-notifier');

            // Check for newer version of gitsu
            var notifier = updateNotifier({
                packageName: pkg.name,
                packageVersion: pkg.version
            });

            if (notifier.update && levels.info >= loglevel) {
                notifier.notify();
            }
        }
    });

//});
