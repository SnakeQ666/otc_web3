import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // 一个简单的配置：1个虚拟用户，执行10次迭代
  vus: 1,
  iterations: 10,
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // 95% 的请求应在 1000ms (1s) 内完成
    'http_req_failed': ['rate<0.1'],   // 失败率应小于10%
  },
};

export default function () {
  const baseUrl = 'http://localhost:8080/api/auth'; // 确认这是您后端运行的正确地址和端口

  // 1. 尝试登录 (使用无效凭证)
  const loginPayload = JSON.stringify({
    email: 'testuser@example.com',
    password: 'invalidpassword',
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
    // 告诉 k6 这些状态码不应被默认标记为请求失败
    expectedStatuses: [200, 400, 401, 403],
  };

  const loginRes = http.post(`${baseUrl}/login`, loginPayload, loginParams);

  console.log(`Login attempt for ${loginPayload.email} - Status: ${loginRes.status}`); // Log the status

  check(loginRes, {
    'login: status is 200 (success) or 401/400 (expected auth failure)': (r) =>
      r.status === 200 || r.status === 401 || r.status === 400 || r.status === 403,
  });

  // 可以在两次迭代之间暂停一小段时间
  sleep(1); // 暂停1秒

  // 2. 您可以添加其他简单的GET请求到公共端点 (如果存在)
  // 例如，如果有一个健康检查端点 GET /api/health
  // const healthRes = http.get('http://localhost:3001/api/health');
  // check(healthRes, {
  //   'health: status is 200': (r) => r.status === 200,
  // });
  // sleep(1);
} 