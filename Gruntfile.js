module.exports = function(grunt) {

    "use strict";

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        assetsDir: 'app',
        distDir: 'dist',
        s3cfg: grunt.file.readJSON('config.json')['s3'],

        availabletasks: {
            tasks: {
                options: {
                    filter: 'include',
                    groups: {
                        'Development': ['dev', 'test:unit', 'test:e2e', 'report'],
                        'Production': ['build'],
                        'Continuous Integration': ['ci']
                    },
                    sort: ['dev', 'test:unit', 'test:e2e', 'report', 'build', 'ci'],
                    descriptions: {
                        'dev' : 'Launch the static server and watch tasks',
                        'test:unit' : 'Run unit tests and show coverage report',
                        'test:e2e' : 'Run end-to-end tests',
                        'report' : 'Open Plato reports in your browser',
                        'build' : 'Package your web app for distribution',
                        'ci' : 'Run unit & e2e tests, package your webapp and generate reports. Use this task for Continuous Integration'
                    },
                    tasks: ['dev', 'test:unit', 'test:e2e',  'build', 'report', 'ci']
                }
            }
        },
        wiredep: {
            task: {
                src: '<%= assetsDir %>/index.jade',

                options: {
                    ignorePath: '<%= assetsDir %>/',
                    verbose: true
                }
            }
        },
        clean: {
            dist: [
                '.tmp',
                '<%= distDir %>',
                // '<%= assetsDir %>/css',
                '<%= assetsDir %>/*.html',
            ]
        },
        copy: {
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= assetsDir %>',
                    dest: '<%= distDir %>/',
                    src: [
                        '*.html', // not ** cause then we get docs and stuff in vendor/
                        'img/**'
                    ]
                }]
            }
        },
        ngmin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '.tmp/concat/js',
                    src: '*.js',
                    dest: '.tmp/concat/js'
                }]
            }
        },
        useminPrepare: {
            html: '<%= assetsDir %>/index.html',
            options: {
                dest: '<%= distDir %>'
            }
        },
        usemin: {
            html: '<%= distDir %>/index.html'
        },
        browser_sync: {
            dev: {
                bsFiles: {
                    src : ['<%= assetsDir %>/**/*.html', '<%= assetsDir %>/**/*.js', '<%= assetsDir %>/**/*.css']
                },
                options: {
                    watchTask: true,
                    ghostMode: {
                        clicks: true,
                        scroll: true,
                        links: false, // must be false to avoid interfering with angular routing
                        forms: true
                    },
                    server: {
                        baseDir: "<%= assetsDir %>"
                    },
                    host: 'localhost'
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all : {
                // src : ['<%= assetsDir %>/js/**/*.js']
                src : [] // TODO TEMP until moving some vendor stuff out of js
            }
        },
        rev: {
            dist: {
                files: {
                    src: [
                        '<%= distDir %>/js/{,*/}*.js',
                        '<%= distDir %>/css/{,*/}*.css'
                    ]
                }
            }
        },
        watch: {
            options : {
                interrupt: true
            },
            js: {
                files: ['<%= assetsDir %>/js/**/*.js'],
                tasks: ['newer:jshint' /*, 'karma:dev_unit:run'*/ ]
            },
            html : {
                files: ['<%= assetsDir %>/**/*.html']
            },
            jade: {
                files: ['<%= assetsDir %>/**/*.jade'],
                tasks: ['newer:jade:compile']
            },
            css: {
                files: ['<%= assetsDir %>/css/**/*.css'],
                tasks: ['csslint']
            },
            bower: {
                files: ['bower.json'],
                tasks: ['wiredep']
            },
            gruntfile: {
                files: ['Gruntfile.js'],
                tasks: ['jade'] // jade config may have changed, so run again
            },
            less: {
                files : ['<%= assetsDir %>/stylesheets/**/*.less'],
                tasks: ['less:all']
            }
        },
        csslint: {
            options: {
                csslintrc: '.csslintrc'
            },
            all : {
                // src : ['<%= assetsDir %>/css/**/*.css']
                src: [] // TODO i don't think we're ready for css linting...
            }
        },
        connect: {
            /*
            test : {
                options: {
                    port: 8887,
                        base: '<%= assetsDir %>',
                        keepalive: false,
                        livereload: false,
                        open: false
                }
            },
            */
            plato : {
                options: {
                    port: 8889,
                        base: 'reports/complexity',
                        keepalive: true,
                        open: true
                }
            }
        },
        /*
        karma: {
            dev_unit: {
                options: {
                    configFile: 'test/conf/unit-test-conf.js',
                        background: true,  // The background option will tell grunt to run karma in a child process so it doesn't block subsequent grunt tasks.
                        singleRun: false,
                        autoWatch: true,
                        reporters: ['progress']
                }
            },
            dist_unit: {
                options: {
                    configFile: 'test/conf/unit-test-conf.js',
                        background: false,
                        singleRun: true,
                        autoWatch: false,
                        reporters: ['progress', 'coverage'],
                        coverageReporter : {
                            type : 'html',
                            dir : '../reports/coverage'
                        }
                }
            },
            e2e: {
                options: {
                    configFile: 'test/conf/e2e-test-conf.js'
                }
            }
        },
        */
        plato : {
            options: {
                jshint : grunt.file.readJSON('.jshintrc'),
                    title : 'Nutmeg'
            },
            all : {
                files: {
                    'reports/complexity': ['<%= assetsDir %>/js/**/*.js']
                }
            }
        },
        less: {
            options: {
                paths: ['<%= assetsDir %>/stylesheets']
            },
            all: {
                files: {
                    "<%= assetsDir %>/css/app.css": "<%= assetsDir %>/stylesheets/app.less"
                }
            }
        },
        imagemin : {
            dist : {
                options : {
                    optimizationLevel: 7,
                    progressive : false,
                    interlaced : true
                },
                files: [{
                    expand: true,
                    cwd: '<%= assetsDir %>/',
                    src: [
                        '**/*.{png,jpg,gif}',
                        '!vendor/ace/**/*' // using CDN version for now, and has loads of images in docs/demos/api/experiments
                    ],
                    dest: '<%= distDir %>/'
                }]
            }
        },
        jade: {
            compile: {
                options: {
                    pretty: true, // indentation - useminPrepare seems to break without it
                    data: {
                        cdnStyles: [
                            '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css',
                        ],
                        styles: [
                            'css/app.css',
                        ],
                        cdnScripts: [
                            '//cdn.firebase.com/js/client/2.0.6/firebase.js',
                            '//cdn.firebase.com/js/simple-login/1.6.4/firebase-simple-login.js',
                            '//cdn.jsdelivr.net/ace/1.1.8/min/ace.js',
                            '//cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.min.js',
                            '//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js',
                            '//ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular.min.js',
                        ],
                        scripts: [
                            'js/lunr.min.js',
                            'js/fuzzy-match-sorter.js',
                            'js/jquery.autocomplete.mod.js',
                            'js/app.js',
                            'js/js.js',
                        ]
                    }
                },
                files: [{
                    expand: true, 
                    src: '**/*.jade', 
                    dest: '<%= assetsDir %>', 
                    cwd: '<%= assetsDir %>/views', 
                    ext: '.html'
                }]
            }
        },
        shell: {
            // grunt-compress was producing empty gzipped files for me so let's use shell
            gzip: {
                // recursively in-place gzip everything (except images) in here, then remove .gz extension:
                command: 'find <%= distDir %> -type f ! -iname "*.png" ! -iname "*.gif" ! -iname "*.jpg" -exec gzip -v9 "{}" \\; -exec mv "{}.gz" "{}" \\;'
            }
        },
        aws_s3: {
            options: {
                accessKeyId: '<%= s3cfg.key %>',
                secretAccessKey: '<%= s3cfg.secret %>',
                // no region defaults to US Standard
                uploadConcurrency: 5
            },
            production: {
                options: {
                    bucket: '<%= s3cfg.appBucket %>',
                    // debug: true, // do a dry run
                },
                files: [
                    {
                        expand: true,
                        cwd: '<%= distDir %>',
                        src: ['**/*.html'],
                        dest: '/',
                        params: {
                            ContentEncoding: 'gzip',
                            CacheControl: 'public, max-age=86400',
                            Expires: new Date(Date.now() + 1000*60*60*24)
                        }
                    },
                    {
                        expand: true,
                        cwd: '<%= distDir %>',
                        src: ['**/*.{js,css}'],
                        dest: '/',
                        params: {
                            ContentEncoding: 'gzip',
                            CacheControl: 'public, max-age=31536000',
                            Expires: new Date(Date.now() + 1000*60*60*24*365)
                        }
                    },
                    {
                        expand: true,
                        cwd: '<%= distDir %>',
                        src: ['**/*.{png,gif,jpg}'],
                        dest: '/',
                        params: {
                            CacheControl: 'public, max-age=31536000',
                            Expires: new Date(Date.now() + 1000*60*60*24*365)
                        }
                    },
                ]
            },
        }
    });

    // tests commented out for now here and throughout as they're totally un-implemented
    // grunt.registerTask('test:e2e', ['connect:test', 'karma:e2e']);
    // grunt.registerTask('test:unit', ['karma:dist_unit:start']);

    grunt.registerTask('report', [
        'plato',
        'connect:plato',
    ]);

    grunt.registerTask('dev', [
        'less:all',
        'jade:compile',
        'browser_sync',
        // 'karma:dev_unit:start',
        'watch',
    ]);

    grunt.registerTask('build', [
        'jshint',
        'clean',
        'less:all',
        'jade:compile',
        'useminPrepare',
        'copy',
        'concat',
        'ngmin',
        'uglify',
        'cssmin',
        'rev',
        'imagemin',
        'usemin',
    ]);

    grunt.registerTask('deploy', [
        'shell:gzip',
        'aws_s3:production',
    ]);

    grunt.registerTask('ci', [
        'build',
        // 'connect:test',
        // 'karma:dist_unit:start',
        // 'karma:e2e',
        'deploy',
        'report',
    ]);

    grunt.registerTask('ls', ['availabletasks']);

};