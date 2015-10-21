/**
 * checkcodedoc
 * 
 *
 * Copyright (c) 2015 
 * Licensed under the MIT license.
 */

'use strict';

var colors = require('colors');

module.exports = function(grunt) {
    
    grunt.registerMultiTask('checkcodedoc', 'Checks a codebase to make sure all methods are documented properly', function() {

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
                paramDocPattern: /@param\s*\{(.+)\}\s(.+)/,
                shortDocWarnings: true,
                enforceStrictTypes: true
            });
        
        var validTypes = ['Boolean', 'Null', 'Undefined', 'Number', 'String', 'Symbol', 'Object', 'Array', 'Function'];
        
        /**
         * Checks that a method's code documentation meets required standard
         *
         * @private
         * @param {String} The name of the method being checked
         * @param {Object} Meta data of the method being tested, including details of parameters, documented parameters etc.
         * @param {Number} The line number the current method is found at
         */
        var checkDocBlock = function(methodName, methodData, lineNumber, errors) {
            var coveredArgumentsLength = methodData.coveredArguments.length;
            
            if (options.shortDocWarnings && methodData.methodDescription && methodData.methodDescription.length === 1) {
                errors.push({
                    msg: 'Code doc only contains one line of description',
                    type: colors.yellow('Warning'),
                    lineNumber: lineNumber,
                    methodName: methodName
                });
            }

            // should be the same number of covered arguments as there are arguments in method signature
            if (coveredArgumentsLength !== methodData.argumentsList.length) {
                errors.push({
                    msg: 'Documented arguments don\'t match method signature, ' + methodData.coveredArgumentsLength + ' documented, ' + methodData.argumentsList.length + ' actual',
                    type: colors.red('Error'),
                    lineNumber: lineNumber,
                    methodName: methodName
                });
            }

            // parameters should be document with the correct type
            for (var x = 0; x < methodData.coveredArgumentsLength; x++) {
                if (options.enforceStrictTypes && coveredArguments[x] && validTypes.indexOf(coveredArguments[x][1]) < 0) {
                    errors.push({
                        msg: 'Document argument is not a valid JavaScript type ( ' + coveredArguments[x][1] + ' )',
                        type: colors.yellow('Warning'),
                        lineNumber: lineNumber,
                        methodName: methodName
                    });
                }
            }
        };
        
        /**
         * Retrieves meta data of the method being checked
         *
         * @private
         * @param {Object} The name of the method being checked
         * @param {Object} Meta data of the method being tested, including details of parameters, documented parameters etc.
         * @return {Object}
         */
        var _getMethodData = function(buffer, methodSignature) {
            var coveredArguments = [],
                methodDescription = [],
                docDetails = buffer.split('*'), //.slice(4, -1); //buffer.match(/\s+\*\s(@param.*?)\*/gi);
                argumentsList = methodSignature[2].replace(' ', '').split(',');

            for (var c = 0; c < docDetails.length; c++) {
                // check that the method's arguments are all documented
                var isCovered = docDetails[c].match(options.paramDocPattern);

                if (isCovered) {
                    coveredArguments.push(isCovered);
                } else {
                    // check that there is a descrptive line of text
                    if (!docDetails[c].match(/\s*@\w+/) && !docDetails[c].match(/\//) && docDetails[c].trim().length) {
                        methodDescription.push(docDetails[c]);
                    }
                }
            }
            
            return {
                methodDescription: methodDescription,
                argumentsList: argumentsList,
                coveredArguments: coveredArguments
            };
        };

        /**
         * Checks that a method's code documentation meets required standard
         *
         * @private
         * @param {String} The full system path to the file being scanned
         */
        var _processFile = function(filepath) {
            var method,
                fileContents = grunt.file.read(filepath),
                lines = fileContents.split('\n'),
                fileLength = lines.length,
                buffer = '',
                captureLines = false,
                methodSignature,
                methodDescription,
                errors = [];

            // var rx = /^(\s*\/\*\*\n(\s*\*[\s\S]*?)\s*\*\/)\s*\w+: function\((.*)\) \{$/g,
            //     arr = rx.exec(fileContents);

            for (var i = 0; i < fileLength; i++) {
                method = null;

                if (captureLines) {
                    // check for end of code docbloc ("*/")
                    if (lines[i].match(/^\s+\*\/\s*$/)) {
                        buffer += lines[i].replace(/(\r\n|\n|\r)/gm, "");

                        captureLines = false;

                        methodSignature = lines[i + 1].match(/\s+(\w+):\sfunction\s*\((.*)\)/);

                        if (methodSignature) {
                            var methodData = _getMethodData(buffer, methodSignature);
                            
                            checkDocBlock(methodSignature[1], methodData, i + 1, errors);
                        }

                        i++;
                        continue;
                    } else {
                        buffer += lines[i].replace(/(\r\n|\n|\r)/gm, "");
                    }
                }

                // check for start of new docbloc
                if (lines[i].match(/^\s+\/\*\*\s*$/)) {
                    buffer = lines[i].replace(/(\r\n|\n|\r)/gm, "");
                    captureLines = true;

                    // reset method description buffer
                    methodDescription = [];
                }

                // check for methods that are not preceded by any codedoc !
                method = lines[i].match(/\s+(\w+):\sfunction\s*\((.*)\)/);

                if (method) {
                    errors.push({
                        msg: 'Method is not documented, or doc block is malformed',
                        type: colors.red('Error'),
                        lineNumber: i,
                        methodName: method[1]
                    });
                }
            }
            
            return {
                fileName: filepath,
                errors: errors
            };
        };
        
        /**
         * Iterates over the collections files specified in the Gruntfile config
         * Processes each file for any errors, and colelcts errors in to an array
         *
         * @private
         * @param {Array} The collection of files to check
         */
        var _generateErrorList = function(fileList) {
            var errorList = [];
            
            // Iterate over all specified file groups.
            fileList.forEach(function(file) {
                var report = file.src.filter(function(filepath) {
                    // Warn on and remove invalid source files (if nonull was set).
                    if (!grunt.file.exists(filepath)) {
                        grunt.log.warn('Source file "' + filepath + '" not found.');
                        return false;
                    } else {
                        return true;
                    }
                }).map(_processFile);

                if (report.length) {
                    errorList = errorList.concat(report);
                }
            });
            
            return errorList;
        };
        
        var errorReport = _generateErrorList(this.files);
        
        /*if (errorReport.length) {
            errorReport.forEach(function(file) {
                if (file.errors && file.errors.length) {
                    grunt.log.writeln("\nFile: '" + file.fileName + "':\n");

                    file.errors.forEach(function(error) {
                        grunt.log.writeln("\t" + error.type + " Line " + error.lineNumber + ", Method '" + error.methodName + "': " + error.msg);
                    });
                }
            });
        }*/
        
        if (errorReport.length) {
            var columnsSizes = [10, 10, 0, 0];
            
            errorReport.forEach(function(file) {
                if (file.errors && file.errors.length) {
                    file.errors.forEach(function(error) {
                        columnsSizes[2] = (error.methodName.length > columnsSizes[2]) ? error.methodName.length : columnsSizes[2];
                        columnsSizes[3] = (error.msg.length > columnsSizes[3]) ? error.msg.length : columnsSizes[3];
                    });
                }
            });
            
            var tableWidth = columnsSizes.reduce(function(a, b) {
                return a+b;
            });
            
            var pad = function(value, size) {
                console.log(value, size);
                var padSize = value.length - size;
                console.log(padSize);
                return value.concat(new Array(padSize).join(' '));
            }
            
            var headerBorder = '+' + new Array(tableWidth - 4).join('-') + '+';
            
            var innerBorder = '+';
            
            columnsSizes.map(function(column) {
                innerBorder += new Array(column - 1).join('-').concat('+');
            });
            
//            console.log(headerBorder);
//            console.log('');
//            console.log(innerBorder);
            
            if (errorReport.length) {
                errorReport.forEach(function(file) {
                    if (file.errors && file.errors.length) {
                        
                        grunt.log.writeln("\n" + headerBorder + "\nFile: '" + file.fileName + "':\n" + innerBorder + "\n");

                        file.errors.forEach(function(error) {
                            // grunt.log.writeln("\t" + error.type + " Line " + error.lineNumber + ", Method '" + error.methodName + "': " + error.msg);
                            grunt.log.writeln("|" + pad(error.type, columnsSizes[1]) + "|" + pad(error.lineNumber, columnsSizes[2]) + "|" + pad(error.methodName, columnSizes[3]) + "|" + pad(error.msg, columnSizes[3]) + "\n");
                            grunt.log.writeln(innerBorder + "\n");
                        });
                    }
                });
            }
        }
        
        grunt.log.writeln("\nCode documentation check completed.");
    });
    
};
