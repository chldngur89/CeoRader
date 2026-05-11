# 태스크 `pricing.lowest` — REST ↔ A2A(JSON-RPC) 매핑

에이전트·CeoRader가 **상품 검색/URL**로 **최저가·오퍼 목록**을 받기 위한 최소 스펙입니다. 실제 수집은 **lowestAlert** 서버가 담당합니다.

---

## 공통 입력 (semantic)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `productName` | string | 조건부* | 비교 검색에 쓰는 상품명 |
| `productUrl` | string | 조건부* | 단일 상품 페이지 URL (크롤) |
| `category` | string | 아니오 | 검색어 보강 (예: 카테고리 키워드) |

\* `productUrl` **또는** (`productName` 또는 `category`) 중 최소 하나.

---

## 공통 출력 (semantic)

`taskType`은 항상 `pricing.lowest`.

| 필드 | 타입 | 설명 |
|------|------|------|
| `taskType` | `"pricing.lowest"` | 태스크 식별자 |
| `taskVersion` | string | 현재 `1.0.0` |
| `input` | object | 에코된 입력 |
| `queryUsed` | string? | URL 모드가 아닐 때 실제 검색에 사용한 문자열 |
| `offers` | array | 오퍼 목록 |
| `offers[].price` | number | 원화 기준 |
| `offers[].currency` | string | `"KRW"` |
| `offers[].isLowest` | boolean | 동일 수집 내 최저가 여부 |
| `lowestPrice` | number \\| null | 오퍼 중 최저가 |
| `lowestOffer` | object \\| null | 해당 오퍼 한 건 |
| `collectedAt` | string | ISO 8601 수집 시각 |
| `currency` | string | `"KRW"` |
| `source` | string | `"lowestAlert"` |

---

## 빠른 검증 (크롤러 없음)

lowestAlert `server` 디렉터리에서:

```bash
npm run verify:pricing
```

내부적으로 `PRICING_LOWEST_DEMO=true`로 서버를 잠깐 띄우고 REST·JSON-RPC·400 응답을 확인합니다.

## REST (primary)

- **lowestAlert**: `POST /api/pricing/lowest`  
  - Body: JSON = 위 **입력** 객체와 동일 키  
  - Response: `{ "success": true, "data": <출력> }` 또는 `{ "success": false, "error": "..." }`

- **CeoRader 프록시**: `POST /api/pricing/lowest`  
  - Body: 동일  
  - Response: lowestAlert와 동일 형태 (환경 변수 `LOWEST_ALERT_API_BASE`로 업스트림 지정, 기본 `http://127.0.0.1:3001`)

---

## A2A-style JSON-RPC (game웨이)

Google A2A 전체 스택 대신, **동일 페이로드를 JSON-RPC로 감싼** 엔드포인트입니다.

| 항목 | 값 |
|------|-----|
| HTTP | `POST /api/a2a` (lowestAlert 서버) |
| `jsonrpc` | `"2.0"` |
| `method` | `"pricing/lowest"` |
| `params` | REST 바디와 **동일 객체** |
| 성공 `result` | REST의 `data` 필드와 **동일** |
| 실패 `error` | JSON-RPC 관례 코드 (`-32602` 잘못된 인자, `-32000` 서버 오류 등) |

### 예시

요청:

```json
{
  "jsonrpc": "2.0",
  "id": "ceorader-1",
  "method": "pricing/lowest",
  "params": { "productName": "갤럭시 버즈", "category": "이어폰" }
}
```

응답 (`result` === REST `data`):

```json
{
  "jsonrpc": "2.0",
  "id": "ceorader-1",
  "result": {
    "taskType": "pricing.lowest",
    "taskVersion": "1.0.0",
    "input": { "productName": "갤럭시 버즈", "category": "이어폰" },
    "queryUsed": "갤럭시 버즈 이어폰",
    "offers": [],
    "lowestPrice": null,
    "lowestOffer": null,
    "collectedAt": "2026-03-26T...",
    "currency": "KRW",
    "source": "lowestAlert"
  }
}
```

---

## 레거시 API 1:1 매핑 (lowestAlert 내부)

| 기존 | 신규 태스크에서의 역할 |
|------|------------------------|
| `POST /api/compare` `{ "productName" }` | `productUrl` 없을 때 `comparePrices(productName [+ category])` |
| `POST /api/analyze` `{ "url" }` | `productUrl` 있을 때 `crawl(url)` → 오퍼 정규화 |

`POST /api/pricing/lowest`는 위 둘을 분기해 **하나의 출력 스키마**로 통합합니다.
