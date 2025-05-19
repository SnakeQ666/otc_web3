'use client';

import { Row, Col, Statistic } from 'antd';
import { useTranslation } from 'react-i18next';

export default function PlatformStats() {
  const { t } = useTranslation();

  return (
    <Row gutter={[24, 24]} className="mb-8">
      <Col xs={24} md={8}>
        <Statistic title={t('stats.totalVolume')} value={1000000} prefix="$" />
      </Col>
      <Col xs={24} md={8}>
        <Statistic title={t('stats.users')} value={5000} />
      </Col>
      <Col xs={24} md={8}>
        <Statistic title={t('stats.dailyVolume')} value={50000} prefix="$" />
      </Col>
    </Row>
  );
} 