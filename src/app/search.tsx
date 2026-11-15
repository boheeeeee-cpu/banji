import { Redirect } from 'expo-router';

// 검색은 찾기 탭(/list)으로 합쳐짐. 예전 주소로 들어오면 찾기 탭으로 보냄.
export default function SearchScreen() {
  return <Redirect href="/list" />;
}
