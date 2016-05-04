"use strict";

var assert = require("assert");
var path = require("path");
var MetadataFile = require("../lib/metadata-file");
var TestObject = require("./metadata-parts/objects");

var objectWithoutFields = [TestObject.header, TestObject.footer].join("\n");
var objectWithTestField = [TestObject.header, TestObject.fields.textField1, TestObject.footer].join("\n");
var objectWithModifiedTestField = [TestObject.header, TestObject.fields.textField1Modified, TestObject.footer].join("\n");
var objectWithRenamedTestField = [TestObject.header, TestObject.fields.textField2, TestObject.footer].join("\n");
var objectWithTestAndATestField = [TestObject.header, TestObject.fields.textField1.replace('Test__c', 'ATest__c'), TestObject.fields.textField1, TestObject.footer].join("\n");

describe('MetadataFile', function() {
	describe('#MetadataFile()', function() {
		it('should parse a filepath', function() {
			var f = new MetadataFile({
				path: path.join('pages', 'Test.page')
			});
			assert.deepEqual(f.path, path.join('pages', 'Test.page'));
			assert.deepEqual(f.extnameWithoutDot(), 'page');
			assert.deepEqual(f.filename(), 'Test');
			assert.deepEqual(f.basename, 'Test.page');
			assert.deepEqual(f.basenameDirname(), 'pages');
			assert.deepEqual(f.parentDirname(), null);

			f = new MetadataFile({
				path: path.join('pages', 'Test.page-meta.xml')
			});
			assert.deepEqual(f.path, path.join('pages/Test.page-meta.xml'));
			assert.deepEqual(f.extnameWithoutDot(), 'xml');
			assert.deepEqual(f.filename(), 'Test.page-meta');
			assert.deepEqual(f.basename, 'Test.page-meta.xml');
			assert.deepEqual(f.basenameDirname(), 'pages');
			assert.deepEqual(f.parentDirname(), null);

			f = new MetadataFile({
				path: path.join('aura', 'TestApp', 'TestApp.cmp')
			});
			assert.deepEqual(f.path, path.join('aura', 'TestApp', 'TestApp.cmp'));
			assert.deepEqual(f.extnameWithoutDot(), 'cmp');
			assert.deepEqual(f.filename(), 'TestApp');
			assert.deepEqual(f.basename, 'TestApp.cmp');
			assert.deepEqual(f.basenameDirname(), 'TestApp');
			assert.deepEqual(f.parentDirname(), 'aura');

			f = new MetadataFile({
				path: path.join('documents', 'unfiled$public', 'foo.png')
			});
			assert.deepEqual(f.path, path.join('documents', 'unfiled$public', 'foo.png'));
			assert.deepEqual(f.extnameWithoutDot(), 'png');
			assert.deepEqual(f.filename(), 'foo');
			assert.deepEqual(f.basename, 'foo.png');
			assert.deepEqual(f.basenameDirname(), path.join('unfiled$public'));
			assert.deepEqual(f.parentDirname(), 'documents');
		});
	});
	describe('#getComponent()', function() {
		it('should return a component for a file', function() {
			var component = new MetadataFile({
				path: path.join('objects', 'Account.object')
			}).getComponent();
			assert.deepEqual(component.type, 'CustomObject');
			assert.deepEqual(component.fileName, path.join('objects', 'Account.object'));
			assert.deepEqual(component.fullName, 'Account');
			assert.deepEqual(component.toString(), 'CustomObject/Account');
		});
	});
	describe('#getComponents()', function() {
		it('should return the components of a metadata file', function() {
			var components = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestField)
			}).getComponents();
			assert.deepEqual(Object.keys(components).length, 1);
			// remove all spaces because of indentation
			assert.deepEqual(components['CustomField']['Test__c'].replace(/ /g, ''), TestObject.fields.textField1.replace(/ /g, ''));
		});
	});
	describe('#diff()', function() {
		it('should return added custom object of a new custom object', function() {
			var mf1 = new MetadataFile();
			var mf2 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestField)
			});
			var diffResult = mf1.diff(mf2);
			assert.deepEqual(diffResult.manifest.manifest().length, 1);
			assert.deepEqual(diffResult.destructiveManifest.manifest().length, 0);
			assert.deepEqual(diffResult.manifest.manifest()[0].toString(), 'CustomObject/Account');
		});
		it('should return added first custom field of a modified custom object', function() {
			var mf1 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithoutFields)
			});
			var mf2 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestField)
			});
			var diffResult = mf1.diff(mf2);
			assert.deepEqual(diffResult.manifest.manifest().length, 1);
			assert.deepEqual(diffResult.destructiveManifest.manifest().length, 0);
			assert.deepEqual(diffResult.manifest.manifest()[0].toString(), 'CustomField/Account.Test__c');
		});
		it('should return destructiveManifest.manifest() last custom field of custom object', function() {
			var mf1 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestField)
			});
			var mf2 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithoutFields)
			});
			var diffResult = mf1.diff(mf2);
			assert.deepEqual(diffResult.manifest.manifest().length, 0);
			assert.deepEqual(diffResult.destructiveManifest.manifest().length, 1);
			assert.deepEqual(diffResult.destructiveManifest.manifest()[0].toString(), 'CustomField/Account.Test__c');
		});
		it('should return added additional custom field of custom object', function() {
			var mf1 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestField)
			});
			var mf2 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestAndATestField)
			});
			var diffResult = mf1.diff(mf2);
			assert.deepEqual(diffResult.manifest.manifest().length, 1);
			assert.deepEqual(diffResult.destructiveManifest.manifest().length, 0);
			assert.deepEqual(diffResult.manifest.manifest()[0].toString(), 'CustomField/Account.ATest__c');
		});
		it('should return destructiveManifest.manifest() additional custom field of custom object', function() {
			var mf1 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestAndATestField)
			});
			var mf2 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestField)
			});
			var diffResult = mf1.diff(mf2);
			assert.deepEqual(diffResult.manifest.manifest().length, 0);
			assert.deepEqual(diffResult.destructiveManifest.manifest().length, 1);
			assert.deepEqual(diffResult.destructiveManifest.manifest()[0].toString(), 'CustomField/Account.ATest__c');
		});
		it('should return changed custom field of custom object', function() {
			var mf1 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestField)
			});
			var mf2 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithModifiedTestField)
			});
			var diffResult = mf1.diff(mf2);
			assert.deepEqual(diffResult.manifest.manifest().length, 1);
			assert.deepEqual(diffResult.destructiveManifest.manifest().length, 0);
			assert.deepEqual(diffResult.manifest.manifest()[0].toString(), 'CustomField/Account.Test__c');
		});
		it('should return renamed custom field of custom object', function() {
			var mf1 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithTestField)
			});
			var mf2 = new MetadataFile({
				path: path.join('objects', 'Account.object'),
				contents: new Buffer(objectWithRenamedTestField)
			});
			var diffResult = mf1.diff(mf2);
			assert.deepEqual(diffResult.manifest.manifest().length, 1);
			assert.deepEqual(diffResult.destructiveManifest.manifest().length, 1);
			assert.deepEqual(diffResult.manifest.manifest()[0].toString(), 'CustomField/Account.Test2__c');
			assert.deepEqual(diffResult.destructiveManifest.manifest()[0].toString(), 'CustomField/Account.Test__c');
		});
	});
});