import { useQuery } from '@tanstack/react-query';

import { loadLidarr } from '../storage/lidarr';

export const useLidarrConfig = () => useQuery({ queryKey: ['lidarr-config'], queryFn: loadLidarr, staleTime: Infinity });
