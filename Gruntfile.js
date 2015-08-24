module.exports = function(grunt) {

    "use strict";

    var ENV = grunt.option('prod') ? 'prod' : 'staging';

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        assetsDir: 'app',
        distDir: 'dist',
        s3cfg: grunt.file.exists('config.json') ? grunt.file.readJSON('config.json')['s3'] : {},

        availabletasks: {
            tasks: {
                options: {
                    filter: 'include',
                    groups: {
                        'Development': ['dev', 'test:unit', /*'test:e2e',*/ 'report'],
                        'Production': ['build', 'nwjs'],
                        'Continuous Integration': ['ci', 'appbuilds']
                    },
                    sort: ['dev', /*'test:unit', 'test:e2e',*/ 'report', 'build', 'nwjs', 'ci', 'appbuilds'],
                    descriptions: {
                        'dev': 'Launch static server and watch tasks (--launch option opens in browser)',
                        // 'test:unit': 'Run unit tests and show coverage report',
                        // 'test:e2e': 'Run end-to-end tests',
                        'report': 'Open Plato reports in browser',
                        'build': 'Package webapp for distribution',
                        'nwjs': 'Builds node-webkit standalone apps',
                        'ci': 'Build, tag, and deploy app. Deploys to staging unless --prod option specified. Add --tag option to tag latest local commit with dated deploy tag.',
                        'appbuilds': 'Builds, packages, and uploads node-webkit standalone apps\n\n(Note bug with grunt.option that doesn\'t allow multiple boolean command line args like `--prod --tag`, so you have to do `--prod=true --tag`)',
                    },
                    tasks: ['dev', /*'test:unit', 'test:e2e',*/  'build', 'nwjs', 'report', 'ci', 'appbuilds']
                }
            }
        },
        wiredep: {
            task: {
                src: ['<%= assetsDir %>/views/header.jade'],

                options: {
                    ignorePath: '../', // wiredep will want to go up one directory because of /views/ folder, but since HTML ends up in assetsDir folder, that's unnecessary
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
                        clicks: false,
                        scroll: false,
                        links: false, // must be false to avoid interfering with angular routing
                        forms: false
                    },
                    server: {
                        baseDir: "<%= assetsDir %>"
                    },
                    online: false, // speeds up startup since we're not using the features of BrowserSync that require internet
                    open: grunt.option('launch') ? "local" : false, // only launch browser if --launch flag passed in
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
            // css: {
            //     files: ['<%= assetsDir %>/css/**/*.css'],
            //     tasks: ['csslint']
            // },
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
        uglify: {
            options: {
                compress: {
                    pure_funcs: grunt.option('prod') ? [
                        "console.log",
                        "console.group",
                        "console.groupCollapsed",
                        "console.groupEnd",
                        "console.time",
                        "console.timeEnd",
                    ] : ''
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
                            '//cdn.firebase.com/js/simple-login/1.6.4/firebase-simple-login.js',
                            '//cdn.jsdelivr.net/g/ace@1.1,lodash@2.4,jquery@2.1', // ALL the libraries in one CDN file, neat! (note that jsdelivr's lodash appears to be a custom build, but seems to have everything we've needed so far)
                        ],
                        scripts: [
                            'js/lunr.min.js',
                            'js/jquery.autocomplete.mod.js',
                            'js/app.js',
                            'js/services/fuzzy-match-sorter.js',
                            'js/services/prog-tag-library.js',
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
            noop: {
                command: ':'
            },

            // grunt-compress was producing empty gzipped files for me so let's use shell
            gzip: {
                // recursively in-place gzip everything (except images) in here, then remove .gz extension:
                command: 'find <%= distDir %> -type f ! -iname "*.png" ! -iname "*.gif" ! -iname "*.jpg" -exec gzip -v9 "{}" \\; -exec mv "{}.gz" "{}" \\;'
            },

            gitTagDeploy: {
                command: 'git tag deployed-' + ENV + '-`date +%s` && git push --tags'
            },
        },
        aws_s3: {
            options: {
                accessKeyId: '<%= s3cfg.key %>',
                secretAccessKey: '<%= s3cfg.secret %>',
                // no region defaults to US Standard
                uploadConcurrency: 5
            },
            prod: {
                options: {
                    bucket: '<%= s3cfg.prodBucket %>',
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
            staging: {
                options: {
                    bucket: '<%= s3cfg.stagingBucket %>',
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
                            CacheControl: 'no-cache'
                        }
                    },
                    {
                        expand: true,
                        cwd: '<%= distDir %>',
                        src: ['**/*.{js,css}'],
                        dest: '/',
                        params: {
                            ContentEncoding: 'gzip',
                            CacheControl: 'no-cache'
                        }
                    },
                    {
                        expand: true,
                        cwd: '<%= distDir %>',
                        src: ['**/*.{png,gif,jpg}'],
                        dest: '/',
                        params: {
                            CacheControl: 'no-cache'
                        }
                    },
                ]
            },
            appbuilds: {
                // only osx64 for now
                options: {
                    bucket: '<%= s3cfg.prodBucket %>',
                    // debug: true, // do a dry run
                },
                files: [
                    {
                        expand: true,
                        cwd: './nw/builds/nutmeg/',
                        src: ['**/*.zip'],
                        dest: '/builds/',
                    },
                ]
            },
        },
        nwjs: {
            // only osx64 for now
            options: {
                appName: 'nutmeg',
                platforms: ['osx64'],
                buildDir: './nw/builds',
                cacheDir: './nw/cache',
                macIcns: './nw/NutmegIcon.icns', // generated by nw/make-icns.sh
            },
            src: ['./nw/**/*']
        },
        compress: {
            appbuilds: {
                // only osx64 for now
                options: {
                    archive: './nw/builds/nutmeg/osx64/nutmeg.app.zip',
                    mode: 'zip'
                },
                files: [
                    {
                        expand: true,
                        cwd: './nw/builds/nutmeg/osx64/nutmeg.app/',
                        src: ['**'],
                        dest: 'nutmeg.app/'
                    }
                ]
            }
        },
    });

    // tests commented out for now here and throughout as they're totally un-implemented
    // grunt.registerTask('test:e2e', ['connect:test', 'karma:e2e']);
    // grunt.registerTask('test:unit', ['karma:dist_unit:start']);

    grunt.registerTask('noop', ['shell:noop']);

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
    grunt.registerTask('serve', ['dev']);
    grunt.registerTask('default', ['availabletasks']);

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
        'aws_s3:' + ENV,
        // @TODO this tagging is a little hacky. has to be optional cause you deploy from local so could deploy uncommitted and wrongly tag latest commit. but the fact that you can do this means latest deploy tag might not match what has been deployed. fix #1: put check in somehow to prevent deploying uncommitted changes. fix #2: use git hooks and/or an actual CI server
        grunt.option('tag') ? 'shell:gitTagDeploy' : 'noop',
    ]);

    grunt.registerTask('ci', [
        'build',
        // 'connect:test',
        // 'karma:dist_unit:start',
        // 'karma:e2e',
        'deploy',
        grunt.option('prod') ? 'report' : 'noop',
    ]);

    grunt.registerTask('appbuilds', [
        'nwjs',
        'compress:appbuilds',
        'aws_s3:appbuilds'
    ]);

    grunt.registerTask('ls', ['availabletasks']);

};