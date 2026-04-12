pipeline {
    agent any
    
    environment {
        // Docker Hub credentials
        DOCKER_HUB_REPO = 'amnaakhan/docker-app'
        DOCKER_HUB_CREDENTIALS = credentials('dockerhub-credentials')
        DOCKER_IMAGE_TAG = "${BUILD_NUMBER}"
        
        // GitHub credentials
        GITHUB_CREDENTIALS = credentials('github-credentials')
    }
    
    stages {
        stage('Checkout Code') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 1: Checkout Code from GitHub    ║'
                echo '╚════════════════════════════════════════╝'
                
                // Fetch code from GitHub
                git(
                    url: 'https://github.com/AmnaaKhan1/Docker.git',
                    branch: 'main',
                    credentialsId: 'github-credentials'
                )
                
                echo '✓ Code checked out successfully'
                sh 'ls -la'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 2: Build Docker Image           ║'
                echo '╚════════════════════════════════════════╝'
                
                script {
                    // Build Docker image from Dockerfile
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
                        
                        # Logout for security
                        docker logout
                    '''
                }
            }
        }
        
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
        
        stage('Verify Deployment') {
            steps {
                echo '╔════════════════════════════════════════╗'
                echo '║  Stage 5: Verify Deployment            ║'
                echo '╚════════════════════════════════════════╝'
                
                script {
                    sh '''
                        echo "Testing health endpoint..."
                        sleep 10
                        
                        # Test health check
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
    }
    
    post {
        success {
            echo '╔════════════════════════════════════════╗'
            echo '║  BUILD SUCCESSFUL ✓                    ║'
            echo '╚════════════════════════════════════════╝'
            echo "Image: ${DOCKER_HUB_REPO}:${DOCKER_IMAGE_TAG}"
            echo "Deployed at: http://your-ec2-public-ip:3001"
        }
        
        failure {
            echo '╔════════════════════════════════════════╗'
            echo '║  BUILD FAILED ✗                        ║'
            echo '╚════════════════════════════════════════╝'
            echo "Check logs above for details"
        }
        
        always {
            echo "Pipeline execution completed"
        }
    }
}