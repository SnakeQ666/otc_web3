'use client';

import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  return (
    <div className="flex items-center">
      <GlobalOutlined className="mr-2" />
      <Select
        defaultValue={i18n.language}
        style={{ width: 100 }}
        onChange={handleLanguageChange}
        options={[
          { value: 'zh', label: t('language.chinese') },
          { value: 'en', label: t('language.english') },
        ]}
      />
    </div>
  );
};

export default LanguageSwitcher;