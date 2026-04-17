# Red Bean Design Homepage

Vercel 배포용 홈페이지입니다.

## 배포 구조

GitHub 저장소 루트에 아래 파일이 바로 있어야 합니다.

```text
index.html
style.css
script.js
api/contact.js
assets/portfolio/*.png
package.json
vercel.json
robots.txt
sitemap.xml
```

`github-root-ready` 폴더 자체를 저장소 안에 넣지 말고, 이 폴더 안의 파일들을 저장소 루트에 올려야 합니다.

## Vercel 환경변수

Vercel 프로젝트의 `Settings > Environment Variables`에 아래 값을 추가하고 `Production`에 적용한 뒤 재배포하세요.

```text
SMTP_HOST=smtp.naver.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=whrudghks154@naver.com
SMTP_PASS=네이버 SMTP 또는 앱 비밀번호
CONTACT_TO=whrudghks154@naver.com
```

환경변수 변경은 기존 배포에 반영되지 않으므로 `Deployments > Redeploy`가 필요합니다.
