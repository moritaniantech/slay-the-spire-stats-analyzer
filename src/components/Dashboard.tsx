import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';
import { Run } from '../store';

const Dashboard: React.FC = () => {
  const [filteredRuns, setFilteredRuns] = useState<Run[]>([]);

  const fetchRuns = async () => {
    try {
      const response = await fetch('/api/runs');
      const data = await response.json();
      setFilteredRuns(data);
    } catch (error) {
      console.error('Error fetching runs:', error);
    }
  };

  useEffect(() => {
    // Fetch runs from the backend
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 非同期fetch内のsetState
    fetchRuns();
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th>日時</th>
            <th>キャラクター</th>
            <th>アセンションレベル</th>
            <th>結果</th>
            <th>フロア到達</th>
            <th>プレイ時間</th>
            <th>詳細</th>
          </tr>
        </thead>
        <tbody>
          {filteredRuns.map((run, index) => (
            <tr key={index} className="hover:bg-base-200">
              <td className="px-4 py-2">{formatDate(run.timestamp)}</td>
              <td className="px-4 py-2">{run.character_chosen}</td>
              <td className="px-4 py-2">{run.ascension_level}</td>
              <td className="px-4 py-2">{run.victory ? '勝利' : '敗北'}</td>
              <td className="px-4 py-2">{run.floor_reached}</td>
              <td className="px-4 py-2">{Math.floor(run.playtime / 60)}分{run.playtime % 60}秒</td>
              <td className="px-4 py-2">
                <Link to={`/play/${run.timestamp}`} className="btn btn-ghost btn-sm">
                  詳細
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard; 