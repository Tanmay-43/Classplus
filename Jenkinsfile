pipeline {
    agent any

    environment {
        IMAGE = 'attendance-app'
        CONTAINER = 'attendance-app'
    }

    stages {
        stage('Clone Repository') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'python -m venv venv'
                bat 'venv\\Scripts\\python.exe -m pip install -r requirements.txt'
            }
        }

        stage('Test Application') {
            steps {
                bat 'venv\\Scripts\\python.exe -c "from app import app; c=app.test_client(); assert c.get(''/login'').status_code == 200; assert c.get(''/health'').status_code == 200; assert c.get(''/dashboard'').status_code == 302; r=c.post(''/login'', data={''username'':''admin'',''password'':''admin123''}); assert r.status_code == 302; assert c.get(''/dashboard'').status_code == 200; assert len(c.get(''/api/data'').json[''students'']) >= 10; print(''All tests passed'')"'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t %IMAGE%:%BUILD_NUMBER% -t %IMAGE%:latest .'
            }
        }

        stage('Deploy Container') {
            steps {
                bat 'docker rm -f %CONTAINER% 2>nul || exit /b 0'
                bat 'docker run -d --name %CONTAINER% -p 5000:5000 %IMAGE%:latest'
            }
        }
    }

    post {
        success {
            echo 'AttendEase deployed at http://localhost:5000'
        }

        failure {
            echo 'Pipeline failed. Check the stage logs.'
        }
    }
}