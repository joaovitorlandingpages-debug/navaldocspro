import { describe, it, expect } from 'vitest';
import { buildCustomerReview, buildVesselReview } from '../documentOcrEngine';

describe('OCR Pipeline Document Review & Mapping Verification', () => {
  it('correctly maps all customer fields from Marina Alves de Souza card', () => {
    const rawCustomerData = {
      rg: '42.891.304-8 SSP/SP',
      cpf: '529.982.247-25',
      city: 'Santos',
      name: 'Marina Alves de Souza',
      email: 'marina.souza@emailficticio.com.br',
      phone: '(13) 99712-4488',
      state: 'SP',
      address: 'Avenida Bartolomeu de Gusmão, 145 Apto 52',
      zip_code: '11015-002',
      birth_date: '1988-06-18',
      _raw_text: `FICHA CADASTRAL DE CLIENTE\nNavalDocs Pro\nNOME COMPLETO\nMarina Alves de Souza\nCPF\n529.982.247-25\nDATA DE NASCIMENTO\n18/06/1988\nRG\n42.891.304-8 SSP/SP\nE-MAIL\nmarina.souza@emailficticio.com.br\nTELEFONE\n(13) 99712-4488\nCEP\n11015-002\nLOGRADOURO\nAvenida Bartolomeu de Gusmão\nNÚMERO\n145\nBAIRRO\nEmbaré\nCIDADE\nSantos\nESTADO (UF)\nSP`,
    };

    const review = buildCustomerReview(
      null,
      'ficha_cliente_marina_alves_de_souza.png',
      rawCustomerData._raw_text,
      rawCustomerData
    );

    expect(review.documentType).toBe('FICHA_CADASTRAL');
    expect(review.documentTypeLabel).toBe('Ficha Cadastral de Cliente');

    expect(review.fields.name?.value).toBe('Marina Alves de Souza');
    expect(review.fields.cpf_cnpj?.value).toBe('529.982.247-25');
    expect(review.fields.rg?.value).toContain('42.891.304-8');
    expect(review.fields.birth_date?.value).toBe('18/06/1988');
    expect(review.fields.email?.value).toBe('marina.souza@emailficticio.com.br');
    expect(review.fields.phone?.value).toBe('(13) 99712-4488');
    expect(review.fields.logradouro?.value).toBe('Avenida Bartolomeu de Gusmão');
    expect(review.fields.numero?.value).toBe('145');
    expect(review.fields.bairro?.value).toBe('Embaré');
    expect(review.fields.cidade?.value).toBe('Santos');
    expect(review.fields.uf?.value).toBe('SP');
    expect(review.fields.cep?.value).toBe('11015-002');
  });

  it('correctly maps all vessel fields including boca, pontal, and owner from Brisa Azul card', () => {
    const rawVesselData = {
      beam: '2.55 m',
      depth: '1.15 m',
      length: '7.85 m',
      capacity: '8 pessoas',
      vessel_name: 'Brisa Azul Teste',
      vessel_type: 'Lancha',
      engine_brand: 'Mercury',
      engine_power: '250 HP',
      engine_serial: '2B491823',
      hull_material: 'Fibra de Vidro',
      owner_name: 'Marina Alves de Souza',
      owner_document: '529.982.247-25',
      navigation_area: 'Interior',
      construction_year: '2021',
      registration_number: '381-019842-7',
      _raw_text: `FICHA TÉCNICA E DADOS DA EMBARCAÇÃO\nNOME DA EMBARCAÇÃO\nBrisa Azul Teste\nTIPO DE EMBARCAÇÃO\nLancha\nNÚMERO DE INSCRIÇÃO\n381-019842-7\nMATERIAL DO CASCO\nFibra de Vidro\nANO DE CONSTRUÇÃO\n2021\nCOMPRIMENTO TOTAL\n7.85 m\nBOCA\n2.55 m\nPONTAL\n1.15 m\nMARCA DO MOTOR\nMercury\nPOTÊNCIA DO MOTOR\n250 HP\nNÚMERO DE SÉRIE DO MOTOR\n2B491823\nNOME DO PROPRIETÁRIO\nMarina Alves de Souza\nCPF DO PROPRIETÁRIO\n529.982.247-25`,
    };

    const review = buildVesselReview(
      null,
      'ficha_embarcacao_brisa_azul_teste.png',
      rawVesselData._raw_text,
      rawVesselData
    );

    expect(['FICHA_EMBARCACAO', 'VESSEL_TIE']).toContain(review.documentType);

    expect(review.fields.name?.value).toBe('Brisa Azul Teste');
    expect(review.fields.registration_number?.value).toBe('381-019842-7');
    expect(review.fields.vessel_type?.value).toBe('Lancha');
    expect(review.fields.hull_material?.value).toBe('Fibra de Vidro');
    expect(review.fields.construction_year?.value).toBe('2021');
    expect(review.fields.length?.value).toBe('7.85');
    expect(review.fields.boca?.value).toBe('2.55');
    expect(review.fields.pontal?.value).toBe('1.15');
    expect(review.fields.engine_brand?.value).toBe('Mercury');
    expect(review.fields.engine_power?.value).toBe('250 HP');
    expect(review.fields.engine_serial_number?.value).toBe('2B491823');
    expect(review.fields.identified_owner_name?.value).toBe('Marina Alves de Souza');
    expect(review.fields.identified_owner_doc?.value).toBe('529.982.247-25');
  });
});
