import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { format } from 'date-fns';
//import './RunDetail.css';
import { getAssetUrl, getRelicImageUrl } from '../utils/assetUtils';
import ImageAsset from './common/ImageAsset';

// RunDetailコンポーネント
const RunDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { runs } = useStore();
  const navigate = useNavigate();
  const [run, setRun] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dataLoaded, setDataLoaded] = useState(false);

  // 利用可能なID一覧をログに出力する（デバッグ用）
  useEffect(() => {
    if (runs && runs.length > 0) {
      console.log('[RunDetail] 利用可能なラン:', runs.length);
      console.log('[RunDetail] 最初の5件のID:', runs.slice(0, 5).map(r => r.id));
    }
  }, [runs]);

  // URLからIDに基づいて実行データを取得
  useEffect(() => {
    let isMounted = true; // アンマウント検出フラグ
    
    // idとrunsの有無をチェック
    console.log('[RunDetail] コンポーネントがマウントされました');
    console.log('[RunDetail] URLパラメータ:', { id });
    console.log('[RunDetail] 利用可能なrun数:', runs?.length || 0);
    
    // データロード状態を初期化
    setDataLoaded(false);
    
    if (!id) {
      console.error('[RunDetail] IDが指定されていません');
      navigate('/404');
      return;
    }
    
    if (!runs || runs.length === 0) {
      console.log('[RunDetail] runsデータがまだ読み込まれていません。読み込み待機中...');
      return; // runsが読み込まれるまで待機
    }
    
    // IDに一致するrunを検索
    console.log('[RunDetail] IDに一致するrunを検索:', id);
    const foundRun = runs.find((r) => r.id === id);
    
    if (foundRun) {
      console.log('[RunDetail] 対応するrunが見つかりました:', foundRun.id);
      console.log('[RunDetail] Runデータのプレビュー:', {
        character: foundRun.character,
        victory: foundRun.victory,
        floor: foundRun.floor_reached
      });
      
      // コンポーネントがマウントされている場合のみ状態を更新
      if (isMounted) {
        setRun(foundRun);
        setDataLoaded(true);
      }
    } else {
      // 実行が見つからない場合はリダイレクト
      console.error('[RunDetail] 該当するrunが見つかりませんでした:', id);
      console.log('[RunDetail] 利用可能なrun ID一覧:', runs.map(r => r.id).slice(0, 10));
      
      if (isMounted) {
        navigate('/404');
      }
    }
    
    // クリーンアップ関数
    return () => {
      console.log('[RunDetail] コンポーネントがアンマウントされました');
      isMounted = false; // アンマウント時にフラグを更新
    };
  }, [id, runs, navigate]);

  // ランが見つからない場合はローディング表示
  if (!run) {
    // 二重レンダリングを考慮して、コンソールログは一度だけ出力
    console.log('[RunDetail] まだRunデータが設定されていません。ローディング表示中...', {
      id,
      dataLoaded,
      runsAvailable: runs?.length || 0
    });
    
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg mb-4"></span>
        <p className="text-lg">プレイデータを読み込み中...</p>
        <p className="text-sm text-base-content/70 mt-2">
          ID: {id || 'なし'}、利用可能なデータ: {runs?.length || 0}件
        </p>
      </div>
    );
  }

  // プレイ時間のフォーマット
  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // キャラクターのフルネームを取得
  const getCharacterFullName = (character: string) => {
    switch (character.toLowerCase()) {
      case 'ironclad': return 'The Ironclad';
      case 'silent': return 'The Silent';
      case 'defect': return 'The Defect';
      case 'watcher': return 'The Watcher';
      default: return character;
    }
  };

  // キャラクターの色を取得
  const getCharacterColor = (character: string) => {
    switch (character.toLowerCase()) {
      case 'ironclad': return 'text-[#ff6563]';
      case 'silent': return 'text-[#7fff00]';
      case 'defect': return 'text-[#87ceeb]';
      case 'watcher': return 'text-[#a600ff]';
      default: return 'text-base-content';
    }
  };

  // キャラクターの背景色を取得
  const getCharacterBgColor = (character: string) => {
    switch (character.toLowerCase()) {
      case 'ironclad': return 'bg-[#ff6563]/10';
      case 'silent': return 'bg-[#7fff00]/10';
      case 'defect': return 'bg-[#87ceeb]/10';
      case 'watcher': return 'bg-[#a600ff]/10';
      default: return 'bg-base-200';
    }
  };

  // キャラクターのアイコンを取得
  const getCharacterIcon = (character: string) => {
    switch (character.toLowerCase()) {
      case 'ironclad': return getAssetUrl('characters/ironclad/button.png');
      case 'silent': return getAssetUrl('characters/silent/button.png');
      case 'defect': return getAssetUrl('characters/defect/button.png');
      case 'watcher': return getAssetUrl('characters/watcher/button.png');
      default: return '';
    }
  };

  // カードタイプのアイコンを取得
  const getCardTypeIcon = (cardType: string) => {
    switch (cardType.toLowerCase()) {
      case 'attack': return getAssetUrl('ui/intent/attack.png');
      case 'skill': return getAssetUrl('ui/intent/buff1.png');
      case 'power': return getAssetUrl('ui/intent/buff2.png');
      case 'status': return getAssetUrl('ui/intent/debuff1.png');
      case 'curse': return getAssetUrl('ui/intent/debuff2.png');
      default: return '';
    }
  };

  // カードタイプの色を取得
  const getCardTypeColor = (cardType: string) => {
    switch (cardType.toLowerCase()) {
      case 'attack': return 'text-red-500';
      case 'skill': return 'text-green-500';
      case 'power': return 'text-blue-500';
      case 'status': return 'text-yellow-500';
      case 'curse': return 'text-purple-500';
      default: return 'text-base-content';
    }
  };

  // レリックの稀少度の色を取得
  const getRelicRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'text-gray-400';
      case 'Uncommon': return 'text-blue-400';
      case 'Rare': return 'text-yellow-400';
      case 'Boss': return 'text-red-400';
      case 'Shop': return 'text-green-400';
      case 'Starter': return 'text-white';
      case 'Event': return 'text-purple-400';
      default: return 'text-base-content';
    }
  };

  // 結果の色を取得
  const getResultColor = (victory: boolean) => {
    return victory ? 'text-success' : 'text-error';
  };

  // レリック画像を取得する関数を修正
  const getRelicImagePath = (relicName: string) => {
    try {
      return getRelicImageUrl(relicName);
    } catch (error) {
      console.error(`Failed to get relic image path: ${relicName}`, error);
      return getAssetUrl('ui/relicSilhouette.png');
    }
  };

  // イベント名を正規化
  const normalizeEventName = (name: string): string => {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/\s+/g, '_') // スペース -> アンダースコア
      .replace(/:/g, '')    // コロン削除
      .replace(/\?/g, '');  // 疑問符削除
  };

    return (
    <div className="container mx-auto px-4 py-8 max-w-[1920px]">
      {/* ヘッダーセクション */}
      <div className={`card ${getCharacterBgColor(run.character)} shadow-lg mb-8`}>
        <div className="card-body p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            {/* キャラクターアイコン */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-base-100/50 flex items-center justify-center">
              {getCharacterIcon(run.character) && (
                <ImageAsset
                  path={`characters/${run.character.toLowerCase()}/button.png`}
                      alt={run.character}
                  className="w-20 h-20 object-contain"
                    />
              )}
                  </div>
            
            {/* 実行情報 */}
            <div className="flex-1">
              <h1 className={`text-3xl font-bold ${getCharacterColor(run.character)}`}>
                {getCharacterFullName(run.character)}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="stat bg-base-200/50 rounded-box p-3">
                  <div className="stat-title">日時</div>
                  <div className="stat-value text-xl">
                    {format(new Date(run.timestamp), 'yyyy-MM-dd HH:mm')}
                </div>
              </div>
                <div className="stat bg-base-200/50 rounded-box p-3">
                  <div className="stat-title">アセンション</div>
                  <div className="stat-value text-xl flex items-center gap-2">
                    <ImageAsset
                      path="ui/topPanel/ascension.png"
                      alt="Ascension"
                      className="w-6 h-6"
                    />
                    {run.ascension_level}
            </div>
          </div>
                <div className="stat bg-base-200/50 rounded-box p-3">
                  <div className="stat-title">結果</div>
                  <div className={`stat-value text-xl ${getResultColor(run.victory)}`}>
                    {run.victory ? '勝利' : '敗北'}
              </div>
            </div>
                <div className="stat bg-base-200/50 rounded-box p-3">
                  <div className="stat-title">スコア</div>
                  <div className="stat-value text-xl flex items-center gap-2">
                    <ImageAsset
                      path="ui/leaderboards/score.png"
                      alt="Score"
                      className="w-6 h-6"
                    />
                    {run.score}
          </div>
        </div>
                  </div>
              </div>
            </div>
          </div>
        </div>

      {/* タブナビゲーション */}
      <div className="tabs tabs-boxed mb-6 bg-base-200 p-2 rounded-lg">
        <button 
          className={`tab tab-lg ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          概要
        </button>
        <button 
          className={`tab tab-lg ${activeTab === 'cards' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          カード
        </button>
        <button 
          className={`tab tab-lg ${activeTab === 'relics' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('relics')}
        >
          レリック
        </button>
        <button 
          className={`tab tab-lg ${activeTab === 'path' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('path')}
        >
          経路
        </button>
                              </div>

      {/* タブコンテンツ */}
      <div className="tab-content">
        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ラン情報 */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">ラン情報</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat bg-base-200/30 rounded-box p-3">
                    <div className="stat-title">到達階層</div>
                    <div className="stat-value text-xl flex items-center gap-2">
                      <ImageAsset
                        path="ui/topPanel/floor.png"
                        alt="Floor"
                        className="w-5 h-5"
                      />
                      {run.floor_reached}
                              </div>
                                </div>
                  <div className="stat bg-base-200/30 rounded-box p-3">
                    <div className="stat-title">プレイ時間</div>
                    <div className="stat-value text-xl flex items-center gap-2">
                      <ImageAsset
                        path="ui/timerIcon.png"
                        alt="Time"
                        className="w-5 h-5"
                      />
                      {formatPlaytime(run.playtime)}
                              </div>
                              </div>
                  <div className="stat bg-base-200/30 rounded-box p-3">
                    <div className="stat-title">最大HP</div>
                    <div className="stat-value text-xl flex items-center gap-2">
                      <ImageAsset
                        path="ui/topPanel/heart.png"
                        alt="HP"
                        className="w-5 h-5"
                      />
                      {run.run_data?.max_hp || '?'}
                              </div>
                              </div>
                  <div className="stat bg-base-200/30 rounded-box p-3">
                    <div className="stat-title">ゴールド</div>
                    <div className="stat-value text-xl flex items-center gap-2">
                      <ImageAsset
                        path="ui/topPanel/gold.png"
                        alt="Gold"
                        className="w-5 h-5"
                      />
                      {run.run_data?.gold || '?'}
                                  </div>
                              </div>
                </div>

                {/* ネオーの祝福 */}
                {run.run_data?.neow_bonus && (
                  <div className="mt-4">
                    <h3 className="text-xl mb-2">ネオーの祝福</h3>
                    <div className="p-3 bg-base-200/30 rounded-box">
                      <p>{run.run_data.neow_bonus}</p>
                      {run.run_data.neow_cost && (
                        <p className="text-error mt-1">コスト: {run.run_data.neow_cost}</p>
                      )}
                                    </div>
                              </div>
                )}
                                  </div>
                              </div>

            {/* キル情報 */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">戦闘情報</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat bg-base-200/30 rounded-box p-3">
                    <div className="stat-title">敵の撃破数</div>
                    <div className="stat-value text-xl">{run.run_data?.killed_monsters || '0'}</div>
                                  </div>
                  <div className="stat bg-base-200/30 rounded-box p-3">
                    <div className="stat-title">エリート撃破数</div>
                    <div className="stat-value text-xl">{run.run_data?.elites_killed || '0'}</div>
                              </div>
                                  </div>

                {/* ボス情報 */}
                {run.run_data?.killed_bosses && run.run_data.killed_bosses.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xl mb-2">撃破したボス</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {run.run_data.killed_bosses.map((boss: string, index: number) => (
                        <div key={index} className="p-3 bg-base-200/30 rounded-box">
                          {boss}
                                  </div>
                      ))}
                              </div>
                                  </div>
                                )}
                              </div>
            </div>

            {/* スコア詳細 */}
            {run.run_data?.score_breakdown && Object.keys(run.run_data.score_breakdown).length > 0 && (
              <div className="card bg-base-100 shadow md:col-span-2">
                <div className="card-body">
                  <h2 className="card-title text-2xl mb-4">スコア詳細</h2>
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th>項目</th>
                          <th className="text-right">スコア</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(run.run_data.score_breakdown).map(([key, value]: [string, any], index: number) => (
                          <tr key={index}>
                            <td>{key}</td>
                            <td className="text-right">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            </div>
        )}

        {/* カードタブ */}
        {activeTab === 'cards' && run.run_data?.master_deck && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">デッキ ({run.run_data.master_deck.length} 枚)</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>カード名</th>
                      <th>タイプ</th>
                      <th>コスト</th>
                      <th>強化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.run_data.master_deck.map((card: string, index: number) => {
                      // カード情報のパース
                      const match = card.match(/^(?:(\d+)\s)?([^+]+?)(\+)?$/);
                      if (!match) return null;
                      
                      const [, count, cardName, upgraded] = match;
                      const displayCount = count ? parseInt(count) : 1;
                      
                      // カードタイプの取得 (ここでは仮にランダムに設定)
                      const cardTypes = ['Attack', 'Skill', 'Power', 'Status', 'Curse'];
                      const cardType = cardTypes[Math.floor(Math.random() * 3)]; // 実際には適切なデータから取得する必要あり

                return (
                        <tr key={index} className="hover:bg-base-200 transition-colors">
                          <td>
                            <div className="flex items-center">
                              {displayCount > 1 && (
                                <span className="badge badge-primary badge-sm mr-2">{displayCount}</span>
                              )}
                              <span>{cardName}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {getCardTypeIcon(cardType) && (
                                <ImageAsset
                                  path={cardType.toLowerCase() === 'attack' ? 'ui/intent/attack.png' : 
                                         cardType.toLowerCase() === 'skill' ? 'ui/intent/buff1.png' :
                                         cardType.toLowerCase() === 'power' ? 'ui/intent/buff2.png' :
                                         cardType.toLowerCase() === 'status' ? 'ui/intent/debuff1.png' :
                                         'ui/intent/debuff2.png'}
                                  alt={cardType}
                                  className="w-5 h-5"
                                />
                              )}
                              <span className={getCardTypeColor(cardType)}>{cardType}</span>
                    </div>
                          </td>
                          <td className="text-center">X</td>
                          <td>
                            {upgraded && (
                              <div className="badge badge-success">+</div>
                            )}
                          </td>
                        </tr>
                );
              })}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
        )}

        {/* レリックタブ */}
        {activeTab === 'relics' && run.run_data?.relics && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">レリック ({run.run_data.relics.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {run.run_data.relics.map((relic: string, index: number) => {
                  // レリックの稀少度をランダムに設定 (実際には正確なデータが必要)
                  const rarities = ['Common', 'Uncommon', 'Rare', 'Boss', 'Shop', 'Starter', 'Event'];
                  const rarity = rarities[Math.floor(Math.random() * rarities.length)];
                
                return (
                    <div key={index} className="bg-base-200/30 p-4 rounded-box">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-base-300 rounded-full flex items-center justify-center">
                          <img
                            src={getRelicImagePath(relic)}
                            alt={relic}
                            className="w-16 h-16 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.dataset.retried) {
                                target.dataset.retried = "true";
                                target.src = getAssetUrl('ui/relicSilhouette.png');
                              }
                            }}
                          />
                    </div>
                        <div>
                          <h4 className="font-medium">{relic}</h4>
                          <p className={`text-sm ${getRelicRarityColor(rarity)}`}>{rarity}</p>
                        </div>
                      </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}

        {/* 経路タブ */}
        {activeTab === 'path' && run.run_data?.path && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">経路</h2>
              <div className="space-y-4">
                {/* 経路の表示はここに実装します */}
                <p>経路データが利用可能です。視覚的な表示は開発中です。</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RunDetail;
