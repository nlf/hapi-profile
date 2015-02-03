## hapi-profile

This plugin wraps [async-profile](https://github.com/Conradlrwin/async-profile) and provides reporting through hapi's logging system. Most of the reporting methods were ported/copied from the original async-profile code.

A summary for each request will be logged on the request itself with a tag of 'hapi-profile'.

A full stack trace with times for each line will be logged on the server object, also with a tag of 'hapi-profile'.
