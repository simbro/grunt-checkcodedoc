/**
 * grunt-checkcodedoc
 * 
 *
 * Copyright (c) 2015 
 * Licensed under the MIT license.
 */

'use strict';

var colors = require('colors'),
    jsonpretty = require('jsonpretty'),
    js2xmlparser = require('js2xmlparser');

module.exports = function(grunt) {
    
    grunt.registerMultiTask('checkcodedoc', 'Checks a codebase to make sure all methods are documented properly', function() {

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
                paramDocPattern: /@param\s*\{(.+)\}\s(.+)/,
                shortDocWarnings: true,
                enforceStrictTypes: true,
                reporter: 'text',
                reporterOutput: 'tmp/output.xml',
                verbose: true
            });
        
        var errorTypes = {
                warning: {
                    text: 'Warning',
                    color: 'yellow'
                },
                error: {
                    text: 'Error',
                    color: 'red'
                }
            };
        
        var validTypes = ['Boolean', 'Null', 'Undefined', 'Number', 'String', 'Symbol', 'Object', 'Array', 'Function'];
        
        var fileCount = 0, errorCount = 0;
        
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
                    type: 'warning',
                    lineNumber: lineNumber,
                    methodName: methodName
                });
            }

            // should be the same number of covered arguments as there are arguments in method signature
            if (coveredArgumentsLength !== methodData.argumentsList.length) {
                if (methodData.argumentsList.length !== 1 && methodData.argumentsList[0] !== '') {
                    errors.push({
                        msg: 'Documented arguments don\'t match method signature, ' + coveredArgumentsLength + ' documented, ' + methodData.argumentsList.length + ' actual',
                        type: 'error',
                        lineNumber: lineNumber,
                        methodName: methodName
                    });
                }
            }

            // parameters should be document with the correct type
            for (var x in methodData.coveredArguments) {
                if (options.enforceStrictTypes && methodData.coveredArguments[x] && validTypes.indexOf(methodData.coveredArguments[x][1]) < 0) {
                    errors.push({
                        msg: 'Documented argument is not a valid JavaScript type ( ' + methodData.coveredArguments[x][1] + ' )',
                        type: 'warning',
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

            for (var i = 0; i < fileLength; i++) {
                method = null;

                if (captureLines) {
                    // check for end of code docbloc ("*/")
                    if (lines[i].match(/^\s+\*\/\s*$/)) {
                        buffer += lines[i].replace(/(\r\n|\n|\r)/gm, "");

                        captureLines = false;

                        methodSignature = lines[i + 1].match(/\s+(\w+):\sfunction\s*\((.*)\)/);
                        
                        if (!methodSignature) {
                            methodSignature = lines[i + 1].match(/\s+(?:var )(.+)\s*[=:]\sfunction\s*\((.*)\)/);
                            captureLines = false;
                        }

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
                method = lines[i].match(/\s+(.+)\s*[=:]\sfunction\s*\((.*)\)/);

                if (method) {
                    errors.push({
                        msg: 'Method is not documented, or doc block is malformed',
                        type: 'error',
                        lineNumber: i,
                        methodName: method[1].trim()
                    });
                }
            }
            
            if (errors.length) {
                errorCount += errors.length;
                
                return {
                    fileName: filepath,
                    errors: errors
                };
            } else {
                return false;
            }
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
                    fileCount++;
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
            
            return errorList.filter(function(file) {
                return file;
            });
        };
        
        /**
         * Prints a tabulated list of errors, grouped by file
         *
         * @private
         * @param {Array} The collection of errors as object literals
         * @param {Object} The report configuration options
         */
        var textReport = function(errorReport, options) {
            if (!errorReport || !errorReport.length) {
                return;
            }
                
            var columnsSizes = [10, 10, 0, 0],
                separator = '|',
                report = '';
            
            errorReport.forEach(function(file) {
                if (file.errors && file.errors.length) {
                    file.errors.forEach(function(error) {
                        columnsSizes[2] = (error.methodName.length > columnsSizes[2]) ? error.methodName.length + 3 : columnsSizes[2];
                        columnsSizes[3] = (error.msg.length > columnsSizes[3]) ? error.msg.length + 3 : columnsSizes[3];
                    });
                }
            });
            
            var innerBorder = '+',
                tableWidth = 20 + columnsSizes[2] + columnsSizes[3],
                headerBorder = '+' + new Array(tableWidth + 4).join('-') + '+',
                pad = function(value, size) {
                    var cellValue = value + '';
                    var padSize = size - cellValue.length;
                    return ' ' + cellValue.concat(new Array(padSize).join(' '));
                },
                columnHeaders = [
                    pad('Type', columnsSizes[0]),
                    pad('Line No.', columnsSizes[1]),
                    pad('Method Name', columnsSizes[2]),
                    pad('Details', columnsSizes[3])
                ],
                getHeaderRow = function(headerTitle) {
                    return "\n" + [
                        headerBorder,
                        separator.concat('File:', headerTitle, separator),
                        innerBorder,
                        separator.concat(columnHeaders.join(separator), separator),
                        innerBorder
                    ].join("\n");
                };
            
            columnsSizes.forEach(function(column) {
                innerBorder += new Array(column + 1).join('-').concat('+');
            });
            
            errorReport.forEach(function(file) {
                report += getHeaderRow(pad(file.fileName, tableWidth - 2));

                // write row for each error
                file.errors.forEach(function(error) {
                    var errorType = errorTypes[error.type],
                        output = [
                            colors[errorType.color](pad(errorType.text, columnsSizes[0])),
                            colors.blue(pad(error.lineNumber, columnsSizes[1])),
                            pad(error.methodName, columnsSizes[2]),
                            pad(error.msg, columnsSizes[3])
                        ];

                    report += "\n" + separator.concat(output.join(separator), separator);
                });
            });
            
            report += "\n" + innerBorder;
            
            if (options.verbose) {
                grunt.log.writeln(report);
            }
            
            report = grunt.log.uncolor(report);
            
            grunt.file.write(options.reporterOutput, report);
        };
        
        /**
         * Prints a json-formatted list of errors
         *
         * @private
         * @param {Array} The collection of errors as object literals
         * @param {Object} The report configuration options
         */
        var jsonReport = function(errorReport, options) {
            var output = jsonpretty(errorReport);
            
            if (options.verbose) {
                grunt.log.writeln(output);
            }
            
            grunt.file.write(options.reporterOutput, output);
        };
        
        /**
         * Prints a XML-formatted list of errors
         *
         * @private
         * @param {Array} The collection of errors as object literals
         * @param {Object} The report configuration options
         */
        var xmlReport = function(errorReport, options) {
            var config = {
                    arrayMap: {
                        files: "file",
                        errors: "error"
                    }
                },
                output = js2xmlparser("files", errorReport, config);
            
            if (options.verbose) {
                grunt.log.writeln(output);
            }
            
            grunt.file.write(options.reporterOutput, output);
        };
        
        var errorReport = _generateErrorList(this.files);
        
        grunt.log.writeln("\nCode documentation check completed.");
        grunt.log.writeln('Scanned a total of ' + fileCount + ' files.');
        
        if (errorReport.length) {
            grunt.log.writeln('Found ' + errorCount + ' errors across ' + errorReport.length + ' files.');
        } else {
            grunt.log.writeln('No errors were detected.');
        }
        
        switch(options.reporter) {
            case 'text':
                textReport(errorReport, options);
                break;
            case 'json':
                jsonReport(errorReport, options);
                break;
            case 'xml':
                xmlReport(errorReport, options);
                break;
            default:
                textReport(errorReport);
        }
        
    });
    
};
