# checkcodedoc

> Checks a codebase to make sure all methods are documented properly.

## Getting Started
This plugin requires Grunt.

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-checkcodedoc --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('checkcodedoc');
```

## The "checkcodedoc" task

### Overview
In your project's Gruntfile, add a section named `checkcodedoc` to the data object passed into `grunt.initConfig()`.

```js
    checkcodedoc: {
      default_options: {
        options: {
            reporter: 'xml',
            reporterOutput: 'build/codedoc-checks/output.xml'
        },
        files: {
            'tmp/default_options': ['test/fixtures/checkcodedoc.js']
        }
      }
    },
```

### Options

#### options.paramDocPattern
Type: `String`
Default value: `/@param\s*\{(.+)\}\s(.+)/`

The format of document method arguments. By default, this format follows the [jsDuck](https://github.com/senchalabs/jsduck) convention.

#### options.shortDocWarnings
Type: `Boolean`
Default value: `true`

If set, then a warning will be generated for methods with only a single line of description.

#### options.enforceStrictTypes
Type: `Boolean`
Default value: `true`

If set, then an error will be generated for each method parameter that does not specify a strict JavaScript type.
```

#### Files Options
The list of files to be scanned can be broken down into items, which contain arrays of filepaths, see the following example:


```js
    checkcodedoc: {
      default_options: {
        options: {
            reporter: 'xml',
            reporterOutput: 'tmp/output.xml',
            verbose: false
        },
        files: {
			'root': ['Gruntfile.js, kaarma.conf.js'],
            'appfiles': ['app/**/*.js'],
			'shared:' ['shared/*.js', 'lib/**/*.js],
			'testfiles': ['test/fixtures/*.js', 'test/specs/**.js']
        }
      }
    }
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2015 . Licensed under the MIT license.
