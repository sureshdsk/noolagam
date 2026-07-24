import React, { useState } from 'react';
import { Book, TabType } from '../types';

interface HomeViewProps {
  books: Book[];
  onSelectBook: (book: Book, tabToOpen?: TabType) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  books,
  onSelectBook,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
}) => {
  const categories = ['அனைத்தும்', 'நாவல்கள்', 'வரலாறு', 'கவிதை', 'சிறுகதைகள்'];

  // Filter books by search & category
  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.englishTitle && book.englishTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'அனைத்தும்' || book.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const ponniyinSelvan = books.find((b) => b.id === 'ponniyin-selvan') || books[0];
  const thirukkural = books.find((b) => b.id === 'thirukkural') || books[1];
  const silappathikaram = books.find((b) => b.id === 'silappathikaram') || books[2];

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Top Section: Greeting & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#6c2f00]">
            வணக்கம், User!
          </h1>
          <p className="text-lg text-[#54433a] mt-2">
            இன்று நீங்கள் என்ன வாசிக்க விரும்புகிறீர்கள்?
          </p>
        </div>

        <div className="w-full md:w-96">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#54433a]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="தேடுக: தலைப்புகள், ஆசிரியர்கள், பிரிவுகள்..."
              className="w-full h-14 pl-12 pr-10 rounded-lg bg-[#fff2d8] border border-[#dac2b6] focus:border-[#6c2f00] focus:ring-1 focus:ring-[#6c2f00] outline-none transition-colors text-[#241a00] placeholder:text-[#54433a]/60 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#54433a] hover:text-[#6c2f00] p-1"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-[#241a00] mb-5">பிரிவுகள்</h2>
        <div className="flex overflow-x-auto pb-3 gap-3 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-none rounded-lg px-6 py-2.5 border transition-all cursor-pointer font-medium text-sm sm:text-base ${
                  isActive
                    ? 'bg-[#6c2f00] text-[#ffffff] border-[#6c2f00] shadow-sm'
                    : 'bg-[#fae7b6] hover:bg-[#f4e1b0] text-[#241a00] border-[#dac2b6]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Classics Bento Section */}
      {!searchQuery && selectedCategory === 'அனைத்தும்' && (
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-[#241a00] mb-6">சிறப்பு நூல்கள்</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Feature Card: Ponniyin Selvan */}
            <div
              onClick={() => onSelectBook(ponniyinSelvan, 'library')}
              className="md:col-span-2 relative bg-[#ffffff] rounded-xl overflow-hidden border border-[#dac2b6] group cursor-pointer h-[380px] md:h-[400px] shadow-sm hover:shadow-md transition-all"
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIYd1o53keqGnsfl6weGbQ8sMTEVfhS-XY4zkEnSPT3ND73bNZ2mcGj2_sIwrjnDTIDnx7v0wlEYADMhaQoueBCADsPLIKtzljr-KKtjao1o9IU1hjpK-kzsIjkhlCBMt7jjeDl2yaxS3G1j5w3gCytpP82GSIQmGaVtwPIqzKYZuBk08_dVJyv9MGEu7qE3oA9gn5VKtJefVI1tCwS50OWE5futxprrIR85-3GbrL575sU9LuorUVzwMpzW4XwJErz-oq2o5A-KU"
                alt="பொன்னியின் செல்வன்"
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#fff8f0] via-[#fff8f0]/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col items-start">
                <span className="bg-[#8b4513] text-[#ffc29f] text-xs font-bold px-3 py-1 rounded-lg mb-3 shadow-xs">
                  {ponniyinSelvan.tag || 'வரலாற்றுப் புதினம்'}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-[#241a00] mb-1">
                  {ponniyinSelvan.title}
                </h3>
                <p className="text-base md:text-lg text-[#54433a] opacity-90 mb-5 font-medium">
                  {ponniyinSelvan.author}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBook(ponniyinSelvan, 'reader');
                  }}
                  className="bg-[#6c2f00] text-[#ffffff] font-bold px-7 py-3 rounded-lg hover:bg-[#6c2f00]/90 transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
                >
                  <span>வாசிக்கத் தொடங்குக</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Small Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-6">
              {/* Small Card 1: Thirukkural */}
              <div
                onClick={() => onSelectBook(thirukkural, 'library')}
                className="relative bg-[#ffffff] rounded-xl overflow-hidden border border-[#dac2b6] group cursor-pointer h-[188px] shadow-sm hover:shadow-md transition-all"
              >
                <img
                  src={thirukkural.coverImage}
                  alt={thirukkural.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#fff8f0] via-[#fff8f0]/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-xl font-bold text-[#241a00] mb-0.5">
                    {thirukkural.title}
                  </h3>
                  <p className="text-sm text-[#54433a] font-medium">{thirukkural.author}</p>
                </div>
              </div>

              {/* Small Card 2: Silappathikaram */}
              <div
                onClick={() => onSelectBook(silappathikaram, 'library')}
                className="relative bg-[#ffffff] rounded-xl overflow-hidden border border-[#dac2b6] group cursor-pointer h-[188px] shadow-sm hover:shadow-md transition-all"
              >
                <img
                  src={silappathikaram.coverImage}
                  alt={silappathikaram.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#fff8f0] via-[#fff8f0]/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-xl font-bold text-[#241a00] mb-0.5">
                    {silappathikaram.title}
                  </h3>
                  <p className="text-sm text-[#54433a] font-medium">
                    {silappathikaram.author}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recently Added / All Books Grid */}
      <section className="mb-10">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-[#241a00]">
            {searchQuery
              ? `தேடல் முடிவுகள் (${filteredBooks.length})`
              : 'சமீபத்தில் சேர்க்கப்பட்டவை'}
          </h2>
          {!searchQuery && (
            <button
              onClick={() => setSelectedCategory('அனைத்தும்')}
              className="text-[#6c2f00] font-bold hover:underline cursor-pointer text-sm"
            >
              அனைத்தையும் காண்க
            </button>
          )}
        </div>

        {filteredBooks.length === 0 ? (
          <div className="bg-[#fff2d8] rounded-xl p-10 text-center border border-[#dac2b6]">
            <span className="material-symbols-outlined text-4xl text-[#877369] mb-2">
              search_off
            </span>
            <p className="text-[#54433a] font-medium">
              எந்தப் புத்தகங்களும் கண்டறியப்படவில்லை. வேறு சொற்களைத் தேடவும்.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book, 'library')}
                className="flex flex-col group cursor-pointer"
              >
                <div className="relative w-full aspect-[2/3] bg-[#fff2d8] rounded-lg border border-[#dac2b6] overflow-hidden mb-3 shadow-sm group-hover:shadow-md transition-all">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {book.inLibrary && (
                    <div className="absolute top-2 right-2 bg-[#8b4513] text-[#ffc29f] text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">bookmark</span>
                      சேமிக்கப்பட்டது
                    </div>
                  )}
                </div>

                <h4 className="font-bold text-[#241a00] text-sm sm:text-base mb-0.5 line-clamp-1">
                  {book.title}
                </h4>
                <p className="text-xs sm:text-sm text-[#54433a] mb-3 line-clamp-1">
                  {book.author}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBook(book, 'reader');
                  }}
                  className="mt-auto w-full py-1.5 border border-[#685e3e] text-[#685e3e] font-bold rounded-lg hover:bg-[#685e3e] hover:text-[#ffffff] transition-colors text-xs cursor-pointer active:scale-95"
                >
                  வாசிக்க
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
