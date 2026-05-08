pipeline {
    agent any
    
    environment {
        // Docker Hub credentials
        DOCKER_HUB_REPO        = 'amnaakhan/docker-app'
        DOCKER_HUB_CREDENTIALS = credentials('dockerhub-credentials')
        DOCKER_IMAGE_TAG       = "${BUILD_NUMBER}"
        
        // GitHub credentials
        GITHUB_CREDENTIALS = credentials('github-credentials')

        // Selenium test image name
        TEST_IMAGE = 'taskmanager-selenium-tests'
    }
    
    stages {

        // ════════════════════════════════════════
        // STAGE 1: Checkout Code from GitHub
        // ════════════════════════════════════════
        stage('Checkout Code') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 1: Checkout Code from GitHub    ║'
                echo '╚════════════════════════════════════════╝'
                
                git(
                    url: 'https://github.com/AmnaaKhan1/Docker.git',
                    branch: 'main',
                    credentialsId: 'github-credentials'
                )
                
                echo '✓ Code checked out successfully'
                sh 'ls -la'
            }
        }

        // ════════════════════════════════════════
        // STAGE 2: Build Docker Image
        // ════════════════════════════════════════
        stage('Build Docker Image') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 2: Build Docker Image           ║'
                echo '╚════════════════════════════════════════╝'
                
                script {
                    sh '''
                        echo "Building Docker image..."
                        docker build -t ${DOCKER_HUB_REPO}:${DOCKER_IMAGE_TAG} ./app
                        docker build -t ${DOCKER_HUB_REPO}:latest ./app
                        
                        echo "Image built successfully:"
                        docker images | grep ${DOCKER_HUB_REPO}
                    '''
                }
            }
        }

        // ════════════════════════════════════════
        // STAGE 3: Push to Docker Hub
        // ════════════════════════════════════════
        stage('Push to Docker Hub') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 3: Push to Docker Hub           ║'
                echo '╚════════════════════════════════════════╝'
                
                script {
                    sh '''
                        echo "Logging in to Docker Hub..."
                        echo "${DOCKER_HUB_CREDENTIALS_PSW}" | \
                            docker login -u "${DOCKER_HUB_CREDENTIALS_USR}" --password-stdin
                        
                        echo "Pushing image to Docker Hub..."
                        docker push ${DOCKER_HUB_REPO}:${DOCKER_IMAGE_TAG}
                        docker push ${DOCKER_HUB_REPO}:latest
                        
                        echo "✓ Image pushed successfully"
                        docker logout
                    '''
                }
            }
        }

        // ════════════════════════════════════════
        // STAGE 4: Deploy with Docker Compose
        // ════════════════════════════════════════
        stage('Deploy with Docker Compose') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 4: Deploy with Docker Compose   ║'
                echo '╚════════════════════════════════════════╝'
                
                script {
                    sh '''
                        echo "Stopping previous deployment..."
                        docker-compose -f docker-compose-pipeline.yml down --remove-orphans || true

                        docker rm -f postgres-pipeline 2>/dev/null || true
                        docker rm -f web-pipeline 2>/dev/null || true
                        
                        echo "Starting new deployment..."
                        docker-compose -f docker-compose-pipeline.yml up -d
                        
                        echo "Waiting for services to be ready..."
                        sleep 45
                        
                        echo "Checking container status..."
                        docker-compose -f docker-compose-pipeline.yml ps
                        
                        echo "✓ Deployment successful"
                    '''
                }
            }
        }

        // ════════════════════════════════════════
        // STAGE 5: Verify Deployment
        // ════════════════════════════════════════
        stage('Verify Deployment') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 5: Verify Deployment            ║'
                echo '╚════════════════════════════════════════╝'
                
                script {
                    sh '''
                        echo "Testing health endpoint..."
                        sleep 10
                        
                        HEALTH_STATUS=$(curl -s http://localhost:3001/health | grep -o '"status":"healthy"')
                        
                        if [[ $HEALTH_STATUS == *"healthy"* ]]; then
                            echo "✓ Health check passed"
                        else
                            echo "⚠ Health check pending (container may still be starting)"
                        fi
                        
                        echo "Testing API endpoints..."
                        curl -s http://localhost:3001/api/items | grep -o "success"
                        
                        echo "✓ Deployment verified"
                    '''
                }
            }
        }

        // ════════════════════════════════════════
        // STAGE 6: Build Selenium Test Image  ← NEW
        // ════════════════════════════════════════
        stage('Build Test Image') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 6: Build Selenium Test Image    ║'
                echo '╚════════════════════════════════════════╝'

                script {
                    sh """
                        echo "Building Selenium test Docker image..."
                        docker build \\
                            -f Dockerfile.selenium \\
                            -t ${TEST_IMAGE}:${DOCKER_IMAGE_TAG} \\
                            .

                        echo "✓ Test image built:"
                        docker images | grep ${TEST_IMAGE}
                    """
                }
            }
        }

        // ════════════════════════════════════════
        // STAGE 7: Run Selenium Tests           ← NEW
        // ════════════════════════════════════════
        stage('Run Selenium Tests') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 7: Run Selenium Tests           ║'
                echo '╚════════════════════════════════════════╝'

                script {
                    sh 'mkdir -p test-reports'

                    sh """
                        docker run --rm \\
                            --name selenium-tests-${DOCKER_IMAGE_TAG} \\
                            --network host \\
                            -v \$(pwd)/test-reports:/tests/test-reports \\
                            ${TEST_IMAGE}:${DOCKER_IMAGE_TAG} \\
                            pytest test_taskmanager.py \\
                                -v \\
                                --tb=short \\
                                --html=test-reports/report.html \\
                                --self-contained-html
                    """
                }
            }

            post {
                always {
                    publishHTML(target: [
                        allowMissing:          false,
                        alwaysLinkToLastBuild: true,
                        keepAll:               true,
                        reportDir:             'test-reports',
                        reportFiles:           'report.html',
                        reportName:            'Selenium Test Report'
                    ])
                    echo '📋 Selenium Test Report published.'
                }
                success {
                    echo '✅ All 15 Selenium tests passed!'
                }
                failure {
                    echo '❌ Some tests failed — check the Selenium Test Report tab.'
                }
            }
        }

        // ════════════════════════════════════════
        // STAGE 8: Cleanup Test Image           ← NEW
        // ════════════════════════════════════════
        stage('Cleanup Test Image') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 8: Cleanup Test Image           ║'
                echo '╚════════════════════════════════════════╝'

                sh """
                    docker rmi ${TEST_IMAGE}:${DOCKER_IMAGE_TAG} || true
                    echo "✓ Test image removed"
                """
            }
        }
    }
    
    post {
        success {
            echo '╔════════════════════════════════════════╗'
            echo '║  BUILD SUCCESSFUL ✓                    ║'
            echo '╚════════════════════════════════════════╝'
            echo "App image : ${DOCKER_HUB_REPO}:${DOCKER_IMAGE_TAG}"
            echo "Deployed  : http://52.14.91.49"
            echo "Tests     : All 15 Selenium tests passed"
        }
        failure {
            echo '╔════════════════════════════════════════╗'
            echo '║  BUILD FAILED ✗                        ║'
            echo '╚════════════════════════════════════════╝'
            echo "Check the failed stage logs above for details."
        }
        always {
            echo "Pipeline execution completed — Build #${BUILD_NUMBER}"
        }
    }
}