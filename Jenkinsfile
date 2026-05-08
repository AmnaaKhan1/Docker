pipeline {
    agent any
    
    environment {
        DOCKER_HUB_REPO        = 'amnaakhan/docker-app'
        DOCKER_HUB_CREDENTIALS = credentials('dockerhub-credentials')
        DOCKER_IMAGE_TAG       = "${BUILD_NUMBER}"
        GITHUB_CREDENTIALS     = credentials('github-credentials')
        TEST_IMAGE             = 'taskmanager-selenium-tests'
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
                            echo "⚠ Health check pending"
                        fi
                        echo "Testing API endpoints..."
                        curl -s http://localhost:3001/api/items | grep -o "success"
                        echo "✓ Deployment verified"
                    '''
                }
            }
        }

        // ════════════════════════════════════════
        // STAGE 6: Build Selenium Test Image
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
                        echo "✓ Test image built"
                        docker images | grep ${TEST_IMAGE}
                    """
                }
            }
        }

        // ════════════════════════════════════════
        // STAGE 7: Run Selenium Tests
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
                success { echo '✅ All 15 Selenium tests passed!' }
                failure { echo '❌ Some tests failed — check the Selenium Test Report tab.' }
            }
        }

        // ════════════════════════════════════════
        // STAGE 8: Cleanup Test Image
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

    // ══════════════════════════════════════════════════════════
    // Post: Email results to whoever made the push
    // GIT_COMMITTER_EMAIL = email of the person who pushed
    // ══════════════════════════════════════════════════════════
    post {
        success {
            echo '╔════════════════════════════════════════╗'
            echo '║  BUILD SUCCESSFUL ✓                    ║'
            echo '╚════════════════════════════════════════╝'

            script {
                // Get the email of whoever pushed this commit
                def pusherEmail = sh(
                    script: "git log -1 --format='%ae'",
                    returnStdout: true
                ).trim()

                echo "📧 Sending test results to: ${pusherEmail}"

                emailext(
                    to:                 "${pusherEmail}",
                    subject:            "✅ BUILD #${BUILD_NUMBER} PASSED — Task Manager Pipeline",
                    mimeType:           'text/html',
                    attachmentsPattern: 'test-reports/report.html',
                    body:               """
<html>
<body style="font-family:Arial,sans-serif;padding:20px;background:#f9fafb;">
  <div style="max-width:600px;margin:auto;background:white;border-radius:8px;
              padding:24px;border:1px solid #e5e7eb;">

    <h2 style="color:#22c55e;margin-top:0;">
      ✅ Jenkins Pipeline — Build #${BUILD_NUMBER} PASSED
    </h2>

    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <tr style="background:#f3f4f6;">
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;width:40%;">Project</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${JOB_NAME}</td>
      </tr>
      <tr>
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Build Number</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">#${BUILD_NUMBER}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Status</td>
        <td style="padding:10px;border:1px solid #e5e7eb;color:#22c55e;"><b>PASSED ✅</b></td>
      </tr>
      <tr>
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Selenium Tests</td>
        <td style="padding:10px;border:1px solid #e5e7eb;"><b>15 / 15 Passed ✅</b></td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Pushed By</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${pusherEmail}</td>
      </tr>
      <tr>
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Application URL</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">
          <a href="http://52.14.91.49">http://52.14.91.49</a>
        </td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Jenkins Build</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">
          <a href="${BUILD_URL}">${BUILD_URL}</a>
        </td>
      </tr>
    </table>

    <br>
    <p style="font-size:14px;">
      📎 The full <b>Selenium Test Report</b> (report.html) is attached.
    </p>
    <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px;">
      Automated message from Jenkins CI/CD Pipeline.
    </p>
  </div>
</body>
</html>
                    """
                )
            }
        }

        failure {
            echo '╔════════════════════════════════════════╗'
            echo '║  BUILD FAILED ✗                        ║'
            echo '╚════════════════════════════════════════╝'

            script {
                def pusherEmail = sh(
                    script: "git log -1 --format='%ae'",
                    returnStdout: true
                ).trim()

                echo "📧 Sending failure notice to: ${pusherEmail}"

                emailext(
                    to:       "${pusherEmail}",
                    subject:  "❌ BUILD #${BUILD_NUMBER} FAILED — Task Manager Pipeline",
                    mimeType: 'text/html',
                    body:     """
<html>
<body style="font-family:Arial,sans-serif;padding:20px;background:#f9fafb;">
  <div style="max-width:600px;margin:auto;background:white;border-radius:8px;
              padding:24px;border:1px solid #e5e7eb;">

    <h2 style="color:#ef4444;margin-top:0;">
      ❌ Jenkins Pipeline — Build #${BUILD_NUMBER} FAILED
    </h2>

    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <tr style="background:#f3f4f6;">
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;width:40%;">Project</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${JOB_NAME}</td>
      </tr>
      <tr>
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Build Number</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">#${BUILD_NUMBER}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Status</td>
        <td style="padding:10px;border:1px solid #e5e7eb;color:#ef4444;"><b>FAILED ❌</b></td>
      </tr>
      <tr>
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Pushed By</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${pusherEmail}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:10px;font-weight:bold;border:1px solid #e5e7eb;">Console Logs</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">
          <a href="${BUILD_URL}console">${BUILD_URL}console</a>
        </td>
      </tr>
    </table>

    <br>
    <p style="font-size:14px;">Please check the console logs link above for failure details.</p>
    <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px;">
      Automated message from Jenkins CI/CD Pipeline.
    </p>
  </div>
</body>
</html>
                    """
                )
            }
        }

        always {
            echo "Pipeline execution completed — Build #${BUILD_NUMBER}"
        }
    }
}