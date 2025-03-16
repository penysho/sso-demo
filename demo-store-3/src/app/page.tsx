"use client";

import Header from "@/components/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヒーローセクション */}
        <div className="bg-gradient-to-b from-teal-50 to-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-teal-900 mb-4">
                新作コレクション
              </h2>
              <p className="text-teal-600 mb-8">
                2024年春の新作アイテムが続々入荷中
              </p>
            </div>
          </div>
        </div>

        {/* 商品カテゴリー */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-2xl font-bold text-teal-900 mb-8">
              カテゴリー
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["メンズ", "レディース", "キッズ"].map((category) => (
                <div
                  key={category}
                  className="aspect-square relative bg-teal-50 rounded-lg overflow-hidden group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-teal-900/0 group-hover:bg-teal-900/10 transition-colors duration-200" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-teal-900/50 to-transparent">
                    <h4 className="text-xl font-bold text-white">{category}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* おすすめ商品 */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-2xl font-bold text-teal-900 mb-8">
              おすすめアイテム
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="aspect-square bg-white rounded-lg overflow-hidden mb-3">
                    <div className="w-full h-full bg-teal-50 group-hover:bg-teal-100 transition-colors duration-200" />
                  </div>
                  <h4 className="font-medium text-teal-900 mb-1">
                    商品名 {i + 1}
                  </h4>
                  <p className="text-sm text-teal-600">
                    ¥{((i + 1) * 1980).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 特集バナー */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-teal-900 rounded-2xl p-12 text-center text-white">
              <h3 className="text-3xl font-bold mb-4">春の新生活応援セール</h3>
              <p className="text-teal-200 mb-6">期間限定で最大50%OFF</p>
              <button className="px-8 py-3 bg-white text-teal-900 rounded-md font-medium hover:bg-teal-50 transition-colors duration-150">
                セール商品をチェック
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-teal-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold mb-4">ショッピング</h4>
              <ul className="space-y-2 text-teal-200">
                <li>新着商品</li>
                <li>ランキング</li>
                <li>セール</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">カテゴリー</h4>
              <ul className="space-y-2 text-teal-200">
                <li>メンズ</li>
                <li>レディース</li>
                <li>キッズ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">カスタマーサービス</h4>
              <ul className="space-y-2 text-teal-200">
                <li>お問い合わせ</li>
                <li>返品・交換</li>
                <li>配送について</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">会社情報</h4>
              <ul className="space-y-2 text-teal-200">
                <li>会社概要</li>
                <li>プライバシーポリシー</li>
                <li>利用規約</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
