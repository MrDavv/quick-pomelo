'use strict';

var Q = require('q');
Q.longStackSupport = true;
var should = require('should');
var path = require('path');
var quick = require('quick-pomelo');
var logger = require('pomelo-logger').getLogger('test', __filename);

var env = {};

Object.defineProperty(env, 'dbConfig', {
	get : function(){
		return {
			shard : 's1',
			redis : {host : '127.0.0.1', port : 6379},
			backend : {engine : 'mongodb', url : 'mongodb://localhost/quick-pomelo-test'},
			slave : {host : '127.0.0.1', port : 6379},
		};
	}
});

env.createApp = function(serverId, serverType){
	var app = quick.mocks.app({serverId : serverId, serverType : serverType});

	app.setBase(path.join(__dirname, '..'));
	app.set('memorydbConfig', env.dbConfig);

	app.load(quick.components.memorydb);
	app.load(quick.components.controllers);
	return app;
};

env.dropDatabase = function(dbConfig, cb){
	if(typeof(dbConfig) === 'function'){
		cb = dbConfig;
		dbConfig = env.dbConfig;
	}

	logger.debug('start dropDatabase');
	return Q.fcall(function(){
		return env.dropRedis(dbConfig.redis);
	})
	.then(function(){
		return env.dropRedis(dbConfig.slave);
	})
	.then(function(){
		return env.dropMongo(dbConfig.backend);
	})
	.then(function(){
		logger.debug('done dropDatabase');
	})
	.nodeify(cb);
};

env.dropRedis = function(redisConfig){
	var client = require('redis').createClient(redisConfig.port, redisConfig.host);
	return Q.nfcall(function(cb){
		client.flushdb(cb);
	})
	.then(function(){
		client.quit();
	});
};

env.dropMongo = function(mongoConfig){
	var db = null;
	return Q.nfcall(function(cb){
		require('mongodb').MongoClient.connect(mongoConfig.url, mongoConfig.options, cb);
	}).then(function(ret){
		db = ret;
		return Q.ninvoke(db, 'dropDatabase');
	}).then(function(){
		return Q.ninvoke(db, 'close');
	});
};

module.exports = env;
