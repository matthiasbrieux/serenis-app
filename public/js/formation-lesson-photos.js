/* One clean 16:9 photo for each lesson; reused in its card and lesson masthead. */
window.VPMFormationLessonPhotos=Object.freeze([
  {"id": "1-1", "file": "1-1_prix_de_la_commune.jpg", "width": 1672, "height": 941},
  {"id": "1-2", "file": "1-2_ventes_autour_du_bien.jpg", "width": 1672, "height": 941},
  {"id": "1-3", "file": "1-3_biens_en_concurrence.jpg", "width": 1672, "height": 941},
  {"id": "1-4", "file": "1-4_avantage_vendu_par_moi.jpg", "width": 1672, "height": 941},
  {"id": "2-1", "file": "2-1_documents_a_reunir.jpg", "width": 1672, "height": 941},
  {"id": "2-2", "file": "2-2_diagnostics_dpe.jpg", "width": 1672, "height": 941},
  {"id": "2-3", "file": "2-3_fiche_descriptive.jpg", "width": 1672, "height": 941},
  {"id": "2-4", "file": "2-4_dossiers_prets_a_envoyer.jpg", "width": 1672, "height": 941},
  {"id": "3-1", "file": "3-1_reussir_ses_photos.jpg", "width": 1672, "height": 941},
  {"id": "3-2", "file": "3-2_albums_photos.jpg", "width": 1672, "height": 941},
  {"id": "3-3", "file": "3-3_rediger_son_annonce.jpg", "width": 1672, "height": 940},
  {"id": "3-4", "file": "3-4_publication_visibilite.jpg", "width": 1672, "height": 941},
  {"id": "4-1", "file": "4-1_programmer_les_visites.jpg", "width": 1672, "height": 941},
  {"id": "4-2", "file": "4-2_qualifier_acheteur.jpg", "width": 1672, "height": 941},
  {"id": "4-3", "file": "4-3_preparer_logement.jpg", "width": 1672, "height": 941},
  {"id": "5-1", "file": "5-1_se_comporter_en_visite.jpg", "width": 1672, "height": 941},
  {"id": "5-2", "file": "5-2_questions_difficiles.jpg", "width": 1672, "height": 941},
  {"id": "6-1", "file": "6-1_comprendre_une_offre.jpg", "width": 1672, "height": 941},
  {"id": "6-2", "file": "6-2_passer_a_action.jpg", "width": 1672, "height": 941},
  {"id": "6-3", "file": "6-3_signer_compromis.jpg", "width": 1672, "height": 941},
  {"id": "6-4", "file": "6-4_vente_et_demenagement.jpg", "width": 1672, "height": 941}
].map(Object.freeze));
window.vpmLessonPhoto=function(mi,si){return window.VPMFormationLessonPhotos[mi===5?[17,18,19,20][si]:[0,4,8,12,15,17][mi]+si];};
