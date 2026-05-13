import AnalysisLoading from '../components/AnalysisLoading.jsx';
import { useRouter } from '../state/RouterContext.jsx';

export default function LoadingPage() {
  const { navigate } = useRouter();
  return <AnalysisLoading onComplete={() => navigate('/analysis/result')} />;
}
