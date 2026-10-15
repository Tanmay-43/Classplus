pipeline {
    agent any

    environment {
        IMAGE = 'attendance-app'
        CONTAINER = 'attendance-app'
        DOCKER = 'C:\\Users\\DELL\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
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
                writeFile file: 'test_app.py', text: '''
from app import app

client = app.test_client()

assert client.get("/login").status_code == 200
assert client.get("/health").status_code == 200
assert client.get("/dashboard").status_code == 302

response = client.post(
    "/login",
    data={"username": "admin", "password": "admin123"}
)
assert response.status_code == 302
assert client.get("/dashboard").status_code == 200
assert len(client.get("/api/data").json["students"]) >= 10

print("All tests passed")
'''
                bat 'venv\\Scripts\\python.exe test_app.py'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat '"%DOCKER%" build -t %IMAGE%:%BUILD_NUMBER% -t %IMAGE%:latest .'
            }
        }

        stage('Deploy Container') {
            steps {
                bat '"%DOCKER%" rm -f %CONTAINER% 2>nul || exit /b 0'
                bat '"%DOCKER%" run -d --name %CONTAINER% -p 5000:5000 %IMAGE%:latest'
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
```
