/** Most of this project uses the package.json (with Webpack etc.) method, and Grunt has fallen out of favor, but whatever, there was non-trivial AWS S3 upload and NWJS stuff working here in the old version of Nutmeg that should be used. */

module.exports = function(grunt) {

    "use strict";

    var ENV = grunt.option('prod') ? 'prod' : 'staging';

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        // assetsDir: 'app',
        distDir: 'dist',
        s3cfg: grunt.file.exists('config.json') ? grunt.file.readJSON('config.json')['s3'] : {},

        availabletasks: {
            tasks: {
                options: {
                    filter: 'include',
                    groups: {
                        'Development': ['nwjs'],
                        // 'Production': ['build', 'nwjs'],
                        'Continuous Integration': ['deploy', 'appbuilds']
                    },
                    sort: ['deploy', 'nwjs', 'appbuilds'],
                    descriptions: {
                        'deploy': 'Deploy app. Deploys to staging unless --prod option specified. Add --tag option to tag latest local commit with dated deploy tag. (Note bug with grunt.option that doesn\'t allow multiple boolean command line args like `--prod --tag`, so you have to do `--prod=true --tag`)',
                        'nwjs': 'Builds node-webkit standalone apps.',
                        'appbuilds': 'Builds, packages, and uploads node-webkit standalone app.',
                    },
                    tasks: ['deploy', 'nwjs', 'appbuilds']
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
                    cwd: '<%= distDir %>/',
                    src: [
                        '**/*.{png,jpg,gif}',
                    ],
                    dest: '<%= distDir %>/'
                }]
            }
        },

        shell: {
            noop: {
                command: ':'
            },

            // grunt-compress was producing empty gzipped files for me so let's use shell
            gzip: {
                // recursively in-place gzip everything, excluding file formats that are already compressed
                command: 'find <%= distDir %> -type f ! -iname "*.png" ! -iname "*.gif" ! -iname "*.jpg" -exec gzip -v9 "{}" \\;',
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
                    gzipRename: 'ext', // renames any *.ext.gz to *.ext (and plugin handles `ContentEncoding: 'gzip'` automatically)
                    // debug: true, // do a dry run
                },
                files: [
                    {
                        expand: true,
                        cwd: '<%= distDir %>',
                        src: ['index.html.gz'],
                        dest: '/',
                        params: {
                            CacheControl: 'public, max-age=' + 60*60*24,
                            Expires: new Date(Date.now() + 1000*60*60*24)
                        }
                    },
                    {
                        expand: true,
                        cwd: '<%= distDir %>',
                        src: ['**/*', '!index.html.gz'],
                        dest: '/',
                        params: {
                            CacheControl: 'public, max-age=' + 60*60*24*365,
                            Expires: new Date(Date.now() + 1000*60*60*24*365)
                        }
                    },
                ]
            },
            staging: {
                options: {
                    bucket: '<%= s3cfg.stagingBucket %>',
                    gzipRename: 'ext',
                    // debug: true, // do a dry run
                },
                files: [
                    {
                        expand: true,
                        cwd: '<%= distDir %>',
                        src: ['index.html.gz'],
                        dest: '/',
                        params: {
                            CacheControl: 'no-cache'
                        }
                    },
                    {
                        expand: true,
                        cwd: '<%= distDir %>',
                        src: ['**/*', '!index.html.gz'],
                        dest: '/',
                        params: {
                            CacheControl: 'public, max-age=' + 60*60*24,
                            Expires: new Date(Date.now() + 1000*60*60*24)
                        }
                    },
                ]
            },
            appbuilds: {
                options: {
                    bucket: '<%= s3cfg.prodBucket %>',
                    // debug: true, // do a dry run
                },
                files: [
                    {
                        expand: true,
                        cwd: './nw/',
                        src: ['headsoak.desktop'],
                        dest: '/builds/linux64/',
                        params: {
                            CacheControl: 'public, max-age=' + 60*60*24*365,
                            Expires: new Date(Date.now() + 1000*60*60*24*365)
                        }
                    },
                    {
                        expand: true,
                        cwd: './nw/builds/headsoak/',
                        src: ['**/*.zip'],
                        dest: '/builds/',
                        params: {
                            CacheControl: 'public, max-age=' + 60*60*24*365,
                            Expires: new Date(Date.now() + 1000*60*60*24*365)
                        }
                    },
                ]
            },
        },

        nwjs: {
            options: {
                appName: 'headsoak',
                platforms: ['osx64', 'win64', 'linux64'],
                buildDir: './nw/builds',
                cacheDir: './nw/cache',
                macIcns: './nw/icon/headsoak.icns', // generated by make-mac-icns.sh or make-mac-icns-sips.sh
                winIco: './nw/icon/headsoak.ico', // generated by `make-windows-icns.sh icon.png headsoak`
            },
            src: ['./nw/**/*']
        },

        compress: {
            appbuild_linux64: {
                options: {
                    archive: './nw/builds/headsoak/linux64/headsoak.zip',
                    mode: 'zip'
                },
                files: [
                    {
                        expand: true,
                        cwd: './nw/builds/headsoak/linux64/',
                        src: ['**'],
                    }
                ]
            },
            appbuild_win64: {
                options: {
                    archive: './nw/builds/headsoak/win64/headsoak.zip',
                    mode: 'zip'
                },
                files: [
                    {
                        expand: true,
                        cwd: './nw/builds/headsoak/win64/',
                        src: ['**'],
                    }
                ]
            },
            appbuild_osx64: {
                options: {
                    archive: './nw/builds/headsoak/osx64/headsoak.app.zip',
                    mode: 'zip'
                },
                files: [
                    {
                        expand: true,
                        cwd: './nw/builds/headsoak/osx64/headsoak.app/',
                        src: ['**'],
                        dest: 'headsoak.app/'
                    }
                ]
            },
        },
    });

    grunt.registerTask('noop', ['shell:noop']);


    grunt.registerTask('default', ['availabletasks']);

    grunt.registerTask('deploy', [
        'imagemin:dist',
        'shell:gzip',
        'aws_s3:' + ENV,
        // @TODO this tagging is a little hacky. has to be optional cause you deploy from local so could deploy uncommitted and wrongly tag latest commit. but the fact that you can do this means latest deploy tag might not match what has been deployed. fix #1: put check in somehow to prevent deploying uncommitted changes. fix #2: use git hooks and/or an actual CI server
        grunt.option('tag') ? 'shell:gitTagDeploy' : 'noop',
    ]);

    grunt.registerTask('appbuilds', [
        // maybe need to clean `nw/builds` first?
        'nwjs',
        'compress:appbuild_linux64',
        'compress:appbuild_win64',
        'compress:appbuild_osx64',
        'aws_s3:appbuilds'
    ]);

};