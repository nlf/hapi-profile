var Hapi = require('hapi');

var lab = exports.lab = require('lab').script();
var expect = require('code').expect;

lab.test('logs status', function (done) {

    var server = new Hapi.Server();
    server.connection();

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {

            reply('hello');
        }
    });

    server.on('log', function (event, tags) {

        expect(tags['hapi-profile']).to.equal(true);
        expect(event.data.request).to.exist();
        expect(event.data.stack).to.exist();
    });

    server.on('request', function (request, event, tags) {

        expect(tags['hapi-profile']).to.equal(true);
        expect(event.data).to.contain(['total', 'real', 'load', 'wait', 'overhead']);
    });

    server.register(require('..'), function (err) {

        expect(err).to.not.exist();

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.payload).to.equal('hello');
            done();
        });
    });
});
