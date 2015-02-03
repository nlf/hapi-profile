var Profiler = require('async-profile');
var Util = require('util');

var internals = {};

internals.formatTime = function (time, format) {

    var response = (1000 * time[0]) + (time[1] / 1000000);
    return format ? response.toFixed(3) : response;
};

internals.diffTime = function (after, before, format) {

    return internals.formatTime([after[0] - before[0], after[1] - before[1]], format);
};

internals.getLineFromStack = function (stack) {

    stack = stack.map(function (f) {

        var line = f.toString();
        return line.indexOf('async-profile') === -1 ? ' at ' + line + '\n' : undefined;
    }).filter(function (f) {

        return f !== undefined;
    }).join('');

    var lines = stack.split('\n');
    var cwdPos, i, il, line;

    for (i = 0, il = lines.length; i < il; ++i) {
        line = lines[i];
        cwdPos = line.indexOf(process.cwd());

        if (cwdPos > -1 &&
            line.indexOf('node_modules') < cwdPos) {

            return line.replace(/^\s*/, '');
        }
    }

    for (i = 0, il = lines.length; i < il; ++i) {
        line = lines[i];
        cwdPos = line.indexOf(process.cwd());

        if (cwdPos > -1) {
            return line.replace(/^\s*/, '');
        }
    }

    return lines[0];
};

internals.generateStack = function (result, parent, indent) {

    indent = indent || '';
    parent = parent || null;
    var stack = [];

    for (var i = 0, il = result.ticks.length; i < il; ++i) {
        var tick = result.ticks[i];
        if (tick.parent !== parent) {
            continue;
        }

        if (!(tick.queue &&
            tick.start &&
            tick.end)) {

            continue;
        }

        var tickTimes = [tick.end[0] - tick.start[0] - tick.overhead[0], tick.end[1] - tick.start[1] - tick.overhead[1]];
        stack.push(Util.format('%d: %dms %s %s (%d)', internals.diffTime(tick.start, result.start, true), internals.formatTime(tickTimes, true), indent, internals.getLineFromStack(tick.stack), internals.formatTime(tick.overhead, true)));
        stack = stack.concat(internals.generateStack(result, tick, indent + '  '));
    }

    return stack;
};

internals.report = function (server, request) {

    return function (result) {

        var start = process.hrtime();
        var sum = [0, 0];
        var wait = [0, 0];
        var min = [Infinity, Infinity];
        var max = [0, 0];
        var overhead = [0, 0];

        for (var i = 0, il = result.ticks.length; i < il; ++i) {
            var tick = result.ticks[i];
            if (!(tick.queue &&
                tick.start &&
                tick.end)) {

                continue;
            }

            if (tick.queue[0] < min[0] ||
                (tick.queue[0] === min[0] &&
                 tick.queue[1] < min[1])) {

                min = tick.queue;
            }

            if (tick.end[0] > max[0] ||
                (tick.end[0] === max[0] &&
                 tick.end[1] > max[1])) {

                max = tick.end;
            }

            var tickTimes = [tick.end[0] - tick.start[0] - tick.overhead[0], tick.end[1] - tick.start[1] - tick.overhead[1]];
            sum[0] += tickTimes[0];
            sum[1] += tickTimes[1];
            wait[0] += tick.start[0] - tick.queue[0];
            wait[1] += tick.start[1] - tick.queue[1];

            overhead[0] += tick.overhead[0];
            overhead[1] += tick.overhead[1];
        }

        var total = internals.formatTime([sum[0] + wait[0], sum[1] + wait[1]]);
        sum = internals.formatTime(sum);
        wait = internals.formatTime(wait);
        var real = internals.diffTime(max, min);
        var load = sum / real;

        var stack = internals.generateStack(result);

        var end = process.hrtime(start);
        overhead[0] += end[0];
        overhead[1] += end[1];
        overhead = internals.formatTime(overhead);

        request.log(['hapi-profile'], { total: total, real: real, load: load, wait: wait, overhead: overhead });
        server.log(['hapi-profile'], { request: request.id, stack: stack });
    };
};

exports.register = function (server, options, next) {

    server.ext('onRequest', function (request, reply) {

        request.profiler = new Profiler({
            callback: internals.report(server, request)
        });

        return reply.continue();
    });

    server.ext('onPreResponse', function (request, reply) {

        request.profiler.stop();
        return reply.continue();
    });

    return next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};
