import { check, sleep } from "k6";
import http from "k6/http";

/**
 * Load test for Kimeru Auto public endpoints.
 *
 * Targets the comparison tool and FIPE lookup endpoints — the two
 * heaviest public flows. Run against a production build:
 *   npm run build && npm start
 *   k6 run tests/load/load-test.js
 */

export const options = {
  scenarios: {
    // Comparison tool: sustained load
    compare: {
      executor: "constant-vus",
      vus: 20,
      duration: "60s",
    },
    // FIPE lookup: burst load on price endpoint
    fipe: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "30s", target: 30 },
        { duration: "30s", target: 5 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // <1% failures
    http_req_duration: ["p(95)<500"], // p95 under 500ms
  },
};

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:3000";

export default function () {
  const urls = [
    `${BASE_URL}/pt-BR/comparar?cars=hb20,onix`,
    `${BASE_URL}/pt-BR/comparar?cars=hb20,onix,polo`,
    `${BASE_URL}/pt-BR/financiamento?price=100000`,
    `${BASE_URL}/pt-BR/carro/hb20`,
    `${BASE_URL}/api/fipe/21/7825/2020-5`,
    `${BASE_URL}/api/fipe/history/1`,
  ];

  const res = http.get(urls[Math.floor(Math.random() * urls.length)]);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has content": (r) => r.body.length > 100,
  });
  sleep(0.5);
}
