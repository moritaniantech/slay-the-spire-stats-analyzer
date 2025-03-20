import React from "react";
import { useStore } from "../store";

// キャラクター画像のインポート
import ironclad from "../assets/images/characters/ironclad.png";
import silent from "../assets/images/characters/silent.png";
import defect from "../assets/images/characters/defect.png";
import watcher from "../assets/images/characters/watcher.png";

const characterImages: { [key: string]: string } = {
  IRONCLAD: ironclad,
  SILENT: silent,
  DEFECT: defect,
  WATCHER: watcher,
};

export const StatsOverview: React.FC = () => {
  const { runs } = useStore();

  // キャラクター毎の統計を計算
  const characterStats = ["IRONCLAD", "SILENT", "DEFECT", "WATCHER"].map(
    (character) => {
      const characterRuns = runs.filter((run) => run.character === character);
      const victories = characterRuns.filter(
        (run) => run.victory && run.floor_reached >= 57
      );

      return {
        character,
        totalPlays: characterRuns.length,
        victories: victories.length,
        winRate:
          characterRuns.length > 0
            ? ((victories.length / characterRuns.length) * 100).toFixed(1)
            : "0.0",
        averageScore:
          characterRuns.length > 0
            ? Math.round(
                characterRuns.reduce((sum, run) => sum + run.score, 0) /
                  characterRuns.length
              )
            : 0,
        highestScore:
          characterRuns.length > 0
            ? Math.max(...characterRuns.map((run) => run.score))
            : 0,
        averageFloor:
          characterRuns.length > 0
            ? Math.round(
                characterRuns.reduce((sum, run) => sum + run.floor_reached, 0) /
                  characterRuns.length
              )
            : 0,
        highestFloor:
          characterRuns.length > 0
            ? Math.max(...characterRuns.map((run) => run.floor_reached))
            : 0,
      };
    }
  );

  return (
    <div className="container mx-auto px-4 space-y-4">
      <div className="max-w-[1920px] mx-auto">
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="text-base border-b border-base-300">
                    <th className="bg-base-200/50 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <span>キャラクター</span>
                      </div>
                    </th>
                    <th className="text-center bg-base-200/50 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <img
                          src="/src/assets/ui/topPanel/deck.png"
                          alt="Total Plays"
                          className="w-5 h-5 mr-1.5"
                        />
                        <span>プレイ回数</span>
                      </div>
                    </th>
                    <th className="text-center bg-base-200/50 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <div className="absolute w-4 h-4">
                            <img 
                              src="/src/assets/ui/topPanel/key_green.png" 
                              alt="Green Key" 
                              className="absolute w-4 h-4 left-0 top-[-1px] transform -rotate-0 origin-center"
                            />
                            <img 
                              src="/src/assets/ui/topPanel/key_blue.png" 
                              alt="Blue Key" 
                              className="absolute w-4 h-4 right-[-1px] top-0 transform rotate-60 origin-center"
                            />
                            <img 
                              src="/src/assets/ui/topPanel/key_red.png" 
                              alt="Red Key" 
                              className="absolute w-4 h-4 left-[-1px] top-0 transform -rotate-60 origin-center"
                            />
                          </div>
                        </div>
                        <span>勝利</span>
                      </div>
                    </th>
                    <th className="text-center bg-base-200/50 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <img
                          src="/src/assets/ui/topPanel/settings.png"
                          alt="Win Rate"
                          className="w-5 h-5 mr-1.5"
                        />
                        <span>勝率</span>
                      </div>
                    </th>
                    <th className="text-center bg-base-200/50 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <img
                          src="/src/assets/ui/leaderboards/score.png"
                          alt="Average Score"
                          className="w-5 h-5 mr-1.5"
                        />
                        <span>平均スコア</span>
                      </div>
                    </th>
                    <th className="text-center bg-base-200/50 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <img
                          src="/src/assets/ui/leaderboards/score.png"
                          alt="Highest Score"
                          className="w-5 h-5 mr-1.5"
                        />
                        <span>最高スコア</span>
                      </div>
                    </th>
                    <th className="text-center bg-base-200/50 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <img
                          src="/src/assets/ui/topPanel/floor.png"
                          alt="Average Floor"
                          className="w-5 h-5 mr-1.5"
                        />
                        <span>平均到達階層</span>
                      </div>
                    </th>
                    <th className="text-center bg-base-200/50 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <img
                          src="/src/assets/ui/topPanel/floor.png"
                          alt="Highest Floor"
                          className="w-5 h-5 mr-1.5"
                        />
                        <span>最高到達階層</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {characterStats.map((stats) => (
                    <tr
                      key={stats.character}
                      className="text-base hover:bg-base-200 transition-colors"
                    >
                      <td className="whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <img
                            src={characterImages[stats.character]}
                            alt={stats.character}
                            title={stats.character}
                            className="w-8 h-8 rounded-full"
                          />
                        </div>
                      </td>
                      <td className="text-center font-medium whitespace-nowrap">
                        {stats.totalPlays}
                      </td>
                      <td className="text-center font-medium whitespace-nowrap">
                        {stats.victories}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <div
                            className="radial-progress text-primary"
                            style={
                              {
                                "--value": Number(stats.winRate),
                                "--size": "2.5rem",
                                "--thickness": "2px",
                              } as React.CSSProperties
                            }
                          >
                            <span className="text-xs">{stats.winRate}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center font-medium whitespace-nowrap">
                        {stats.averageScore.toLocaleString()}
                      </td>
                      <td className="text-center font-medium whitespace-nowrap">
                        {stats.highestScore.toLocaleString()}
                      </td>
                      <td className="text-center font-medium whitespace-nowrap">
                        {stats.averageFloor}
                      </td>
                      <td className="text-center font-medium whitespace-nowrap">
                        {stats.highestFloor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
