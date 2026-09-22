pipeline {

    agent any

    parameters {

        choice(
            name: 'DEPLOYMENT_ACTION',
            choices: ['DEPLOY', 'ROLLBACK'],
            description: 'Select deployment action'
        )

        choice(
            name: 'ENVIRONMENT',
            choices: ['UAT', 'PROD'],
            description: 'Select environment'
        )

        string(
            name: 'VERSION',
            defaultValue: '4.2.1',
            description: 'Version to deploy, example: 4.2.1'
        )

        choice(
            name: 'CONFIRM_PROD',
            choices: ['NO', 'YES'],
            description: 'Production confirmation'
        )
    }

    environment {

        GIT_URL = 'https://github.com/tejaswire/Retail-platform-1.git'

        GIT_CREDENTIALS = 'sample-credentials'

        DOCKER = 'C:\\Users\\DELL\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'

        IMAGE_NAME = 'retail-app'

        PROD_CONTAINER = 'retail-app-prod'

        CANDIDATE_CONTAINER = 'retail-app-candidate'

        PROD_PORT = '8081'

        CANDIDATE_PORT = '8082'

        NETWORK_NAME = 'retail-app-net'
    }

    stages {

        stage('Validate Parameters') {

            steps {

                script {

                    echo "======================================"
                    echo "VALIDATING PARAMETERS"
                    echo "======================================"

                    echo "Action       : ${params.DEPLOYMENT_ACTION}"
                    echo "Environment  : ${params.ENVIRONMENT}"
                    echo "Version      : ${params.VERSION}"
                    echo "Confirm Prod : ${params.CONFIRM_PROD}"

                    if (!params.VERSION?.trim()) {
                        error("VERSION cannot be empty")
                    }

                    if (!(params.VERSION ==~ /^\d+\.\d+\.\d+$/)) {
                        error("VERSION must be in X.Y.Z format")
                    }

                    if (
                        params.ENVIRONMENT == 'PROD' &&
                        params.CONFIRM_PROD != 'YES'
                    ) {
                        error("Production deployment requires CONFIRM_PROD = YES")
                    }
                }
            }
        }

        stage('Checkout Git Version') {

            steps {

                checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    userRemoteConfigs: [[
                        url: env.GIT_URL,
                        credentialsId: env.GIT_CREDENTIALS
                    ]]
                ])

                bat """
                    git fetch --all --tags --force

                    echo ======================================
                    echo SELECTED GIT VERSION
                    echo ======================================

                    git rev-parse refs/tags/v${params.VERSION}

                    git checkout tags/v${params.VERSION}

                    git log -1 --oneline

                    git describe --tags --always
                """
            }
        }

        stage('Build Docker Image') {

            steps {

                echo "======================================"
                echo "BUILDING DOCKER IMAGE"
                echo "======================================"

                bat """
                    "${env.DOCKER}" build ^
                    -t ${env.IMAGE_NAME}:${params.VERSION} .
                """

                bat """
                    "${env.DOCKER}" images ${env.IMAGE_NAME}
                """
            }
        }

        stage('Create Docker Network') {

            steps {

                bat """
                    "${env.DOCKER}" network inspect ${env.NETWORK_NAME} >nul 2>&1

                    if errorlevel 1 (
                        "${env.DOCKER}" network create ${env.NETWORK_NAME}
                    )
                """
            }
        }

        stage('Record Previous Production') {

            steps {

                script {

                    def result = bat(
                        script: """
                            @echo off
                            "${env.DOCKER}" inspect ^
                            --format="{{.Config.Image}}" ^
                            ${env.PROD_CONTAINER}
                        """,
                        returnStatus: true
                    )

                    if (result == 0) {

                        env.PREVIOUS_IMAGE = bat(
                            script: """
                                @echo off
                                "${env.DOCKER}" inspect ^
                                --format="{{.Config.Image}}" ^
                                ${env.PROD_CONTAINER}
                            """,
                            returnStdout: true
                        ).trim()

                        echo "======================================"
                        echo "PREVIOUS PRODUCTION IMAGE"
                        echo "======================================"

                        echo "OLD VERSION : ${env.PREVIOUS_IMAGE}"

                    } else {

                        env.PREVIOUS_IMAGE = ""

                        echo "No previous production container found."
                    }
                }
            }
        }

        stage('Start New Version') {

            steps {

                echo "======================================"
                echo "STARTING NEW VERSION"
                echo "======================================"

                bat """
                    "${env.DOCKER}" rm -f ${env.CANDIDATE_CONTAINER} 2>nul || exit /b 0

                    "${env.DOCKER}" run -d ^
                    --name ${env.CANDIDATE_CONTAINER} ^
                    --network ${env.NETWORK_NAME} ^
                    -p ${env.CANDIDATE_PORT}:8081 ^
                    ${env.IMAGE_NAME}:${params.VERSION}
                """
            }
        }

        stage('Health Check New Version') {

            steps {

                script {

                    bat "timeout /t 15 /nobreak"

                    echo "======================================"
                    echo "CHECKING NEW VERSION HEALTH"
                    echo "======================================"

                    def health = bat(
                        script: """
                            @echo off

                            powershell -NoProfile -Command ^
                            "try { ^
                                \$r=Invoke-WebRequest ^
                                -UseBasicParsing ^
                                http://localhost:${env.CANDIDATE_PORT}/health ^
                                -TimeoutSec 5; ^
                                Write-Host \$r.Content; ^
                                if(\$r.StatusCode -ne 200){exit 1} ^
                            } catch { ^
                                Write-Host 'HEALTH CHECK FAILED'; ^
                                exit 1 ^
                            }"
                        """,
                        returnStatus: true
                    )

                    if (health != 0) {

                        echo "======================================"
                        echo "NEW VERSION HEALTH CHECK FAILED"
                        echo "======================================"

                        bat """
                            "${env.DOCKER}" logs ${env.CANDIDATE_CONTAINER}
                        """

                        bat """
                            "${env.DOCKER}" rm -f ${env.CANDIDATE_CONTAINER}
                        """

                        error(
                            "Version ${params.VERSION} failed health check"
                        )
                    }

                    echo "New version health check PASSED."
                }
            }
        }

        stage('Promote New Version') {

            steps {

                echo "======================================"
                echo "PROMOTING NEW VERSION"
                echo "======================================"

                bat """
                    "${env.DOCKER}" rm -f ${env.PROD_CONTAINER} 2>nul || exit /b 0

                    "${env.DOCKER}" rm -f ${env.CANDIDATE_CONTAINER} 2>nul || exit /b 0

                    "${env.DOCKER}" run -d ^
                    --name ${env.PROD_CONTAINER} ^
                    --network ${env.NETWORK_NAME} ^
                    -p ${env.PROD_PORT}:8081 ^
                    ${env.IMAGE_NAME}:${params.VERSION}
                """
            }
        }

        stage('Final Production Health Check') {

            steps {

                script {

                    bat "timeout /t 15 /nobreak"

                    echo "======================================"
                    echo "FINAL PRODUCTION HEALTH CHECK"
                    echo "======================================"

                    def finalHealth = bat(
                        script: """
                            @echo off

                            powershell -NoProfile -Command ^
                            "try { ^
                                \$r=Invoke-WebRequest ^
                                -UseBasicParsing ^
                                http://localhost:${env.PROD_PORT}/health ^
                                -TimeoutSec 5; ^
                                Write-Host \$r.Content; ^
                                if(\$r.StatusCode -ne 200){exit 1} ^
                            } catch { ^
                                Write-Host 'PRODUCTION HEALTH CHECK FAILED'; ^
                                exit 1 ^
                            }"
                        """,
                        returnStatus: true
                    )

                    if (finalHealth != 0) {

                        echo "Production health check FAILED."

                        error(
                            "Production deployment health check failed"
                        )
                    }

                    echo "Production health check PASSED."
                }
            }
        }

        stage('Deployment Evidence') {

            steps {

                echo "======================================"
                echo "DEPLOYMENT EVIDENCE"
                echo "======================================"

                bat """
                    echo DOCKER IMAGES
                    "${env.DOCKER}" images
                """

                bat """
                    echo RUNNING CONTAINERS
                    "${env.DOCKER}" ps
                """

                bat """
                    echo PRODUCTION CONTAINER
                    "${env.DOCKER}" inspect ${env.PROD_CONTAINER}
                """
            }
        }
    }

    post {

        success {

            echo "======================================"
            echo "DEPLOYMENT SUCCESSFUL"
            echo "======================================"

            echo "OLD VERSION : ${env.PREVIOUS_IMAGE}"
            echo "NEW VERSION : ${env.IMAGE_NAME}:${params.VERSION}"
            echo "FINAL STATE : RUNNING"
        }

        failure {

            echo "======================================"
            echo "DEPLOYMENT FAILED"
            echo "======================================"

            echo "OLD VERSION : ${env.PREVIOUS_IMAGE}"
            echo "NEW VERSION : ${env.IMAGE_NAME}:${params.VERSION}"
            echo "FINAL STATE : FAILURE"
        }

        always {

            echo "======================================"
            echo "FINAL DOCKER STATUS"
            echo "======================================"

            bat """
                "${env.DOCKER}" ps -a
            """
        }
    }
}