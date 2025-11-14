"use client";

const Header = () => {
  return (
    <div className="text-center">
      <div className="inline-flex items-center space-x-3 mb-4">
        <div className="w-20 h-20 mt-5 rounded-xl flex items-center justify-center">
          <img
            src="https://rented123-brand-files.s3.us-west-2.amazonaws.com/logo_white.svg"
            alt="Rented123"
            width={73.75}
            height={100}
            className="w-[60px] md:w-[73px]"
          />
        </div>
      </div>
      <p className="text-gray-600 max-w-sm md:max-w-lg mx-auto hidden md:block">
        Secure identity verification in three simple steps. Your privacy and
        security are our top priority.
      </p>
    </div>
  );
};

export default Header;
